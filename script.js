// Variáveis globais
let firesChart = null;
let airChart = null;
let map = null;
let currentRegion = 'Norte';
const OPENWEATHER_API_KEY = '709a870446d4a4da539f2cc0e452fce6'; // Substitua pela sua chave OpenWeatherMap

// Inicialização do mapa
function initMap() {
  map = L.map('brazilMap').setView([-15, -55], 4);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  // Adiciona regiões clicáveis
  const regions = {
    'Norte': { lat: -3, lng: -62, color: '#4CAF50' },
    'Nordeste': { lat: -8, lng: -42, color: '#2196F3' },
    'Centro-Oeste': { lat: -15, lng: -54, color: '#FFC107' },
    'Sudeste': { lat: -20, lng: -45, color: '#F44336' },
    'Sul': { lat: -27, lng: -52, color: '#9C27B0' }
  };

  Object.entries(regions).forEach(([name, data]) => {
    L.circleMarker([data.lat, data.lng], {
      radius: 20,
      fillColor: data.color,
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(map)
      .bindPopup(`<b>${name}</b><br>Clique para ver dados`)
      .on('click', () => {
        currentRegion = name;
        document.getElementById('regionSelect').value = name;
        fetchFiresByRegion(name);
      });
  });
}

// API Queimadas
async function fetchFiresByRegion(region) {
  const resultDiv = document.getElementById('firesData');
  resultDiv.innerHTML = '<div class="loading"></div> Buscando dados de queimadas...';
  
  try {
    const apiKey = '1470d8fd6a62ad792549e276f5653cea';
    const country = 'BRA';
    const url = `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${apiKey}/VIIRS_SNPP_NRT/${country}/1`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    
    const data = await response.text();
    const lines = data.split('\n').slice(1).filter(line => line.trim() !== '');
    
    // Filtra por região (corrigido case sensitivity)
    const regionFires = lines.filter(line => {
      const lat = parseFloat(line.split(',')[1]);
      if (isNaN(lat)) return false;
      
      if (region === 'Norte') return lat < -2;
      if (region === 'Nordeste') return lat > -10 && lat < -2;
      if (region === 'Centro-Oeste') return lat > -15 && lat < -10;
      if (region === 'Sudeste') return lat > -20 && lat < -15;
      if (region === 'Sul') return lat > -30 && lat < -20;
      return true;
    }).slice(0, 50);

    // Exibe resultados
    resultDiv.innerHTML = `
      <h3>Focos na região ${region}</h3>
      <p>Total de focos: <strong>${regionFires.length}</strong></p>
      <div class="fires-list">
        ${regionFires.slice(0, 10).map(line => {
          const [_, lat, long, brightness, acq_date] = line.split(',');
          return `
            <div class="fire-point">
              <strong>${lat}, ${long}</strong><br>
              ${brightness}°C - ${acq_date}
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    updateFiresChart(regionFires.length);
    
  } catch (error) {
    resultDiv.innerHTML = `
      <div class="error">
        Falha ao buscar dados de queimadas:<br>
        ${error.message}<br><br>
        <small>Se o erro persistir, tente novamente mais tarde</small>
      </div>
    `;
    console.error('Erro ao buscar queimadas:', error);
  }
}

// API Qualidade do Ar (OpenWeatherMap)
document.getElementById('fetchAir').addEventListener('click', async () => {
  const city = document.getElementById('citySelect').value;
  const resultDiv = document.getElementById('airData');
  resultDiv.innerHTML = '<div class="loading"></div> Buscando dados de qualidade do ar...';
  
  try {
    if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === 'SUA_CHAVE_AQUI') {
      throw new Error('Por favor, configure sua chave da API OpenWeatherMap no código');
    }
    
    // 1. Primeiro obtemos as coordenadas da cidade
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)},BR&limit=1&appid=${OPENWEATHER_API_KEY}`;
    const geoResponse = await fetch(geoUrl);
    
    if (!geoResponse.ok) {
      const errorData = await geoResponse.json();
      throw new Error(errorData.message || 'Erro ao buscar localização');
    }
    
    const geoData = await geoResponse.json();
    
    if (!geoData.length) throw new Error('Cidade não encontrada. Tente outra cidade ou verifique o nome.');
    
    const { lat, lon } = geoData[0];
    
    // 2. Agora obtemos os dados de poluição
    const airUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`;
    const airResponse = await fetch(airUrl);
    
    if (!airResponse.ok) {
      const errorData = await airResponse.json();
      throw new Error(errorData.message || 'Erro ao buscar qualidade do ar');
    }
    
    const airData = await airResponse.json();
    
    const aqi = airData.list[0].main.aqi;
    const components = airData.list[0].components;
    
    // Mapeia os níveis de qualidade do ar
    const aqiLevels = [
      'Boa 🌱', 'Moderada 😐', 'Ruim para grupos sensíveis 😷',
      'Ruim 😨', 'Muito Ruim ☠️'
    ];
    const level = aqiLevels[aqi - 1] || 'Desconhecido';
    const color = getAqiColor(aqi * 20);
    
    // Encontra o poluente principal
    const mainPollutant = Object.entries(components).reduce((a, b) => 
      a[1] > b[1] ? a : b
    )[0];
    
    resultDiv.innerHTML = `
      <div class="air-quality-card" style="background:${color}">
        <h3>${city}</h3>
        <div class="aqi-value">${aqi}</div>
        <div class="aqi-level">${level}</div>
        <div class="details">
          <p>Poluente principal: ${formatPollutant(mainPollutant)}</p>
          <p>PM2.5: ${components.pm2_5} μg/m³ | PM10: ${components.pm10} μg/m³</p>
          <p>Atualizado: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;
    
    updateAirChart(aqi * 20);
    
  } catch (error) {
    resultDiv.innerHTML = `
      <div class="error">
        Falha ao buscar dados de qualidade do ar:<br>
        ${error.message}<br><br>
        <small>Certifique-se de usar uma chave API válida do OpenWeatherMap e que a cidade está correta</small>
      </div>
    `;
    console.error('Erro ao buscar qualidade do ar:', error);
  }
});

// Funções auxiliares
function formatPollutant(pollutant) {
  const names = {
    co: 'Monóxido de Carbono',
    no: 'Óxido de Nitrogênio',
    no2: 'Dióxido de Nitrogênio',
    o3: 'Ozônio',
    so2: 'Dióxido de Enxofre',
    pm2_5: 'Material Particulado (PM2.5)',
    pm10: 'Material Particulado (PM10)',
    nh3: 'Amônia'
  };
  return names[pollutant] || pollutant;
}

function getAqiColor(aqi) {
  if (aqi <= 50) return '#4CAF50';
  if (aqi <= 100) return '#FFEB3B';
  if (aqi <= 150) return '#FF9800';
  if (aqi <= 200) return '#F44336';
  if (aqi <= 300) return '#9C27B0';
  return '#673AB7';
}

function updateFiresChart(count) {
  const ctx = document.getElementById('firesChart');
  
  if (firesChart) firesChart.destroy();
  
  firesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Focos de Queimadas'],
      datasets: [{
        label: 'Quantidade',
        data: [count],
        backgroundColor: '#FF5722'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function updateAirChart(aqi) {
  const ctx = document.getElementById('airChart');
  
  if (airChart) airChart.destroy();
  
  airChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Boa', 'Moderada', 'Ruim', 'Muito Ruim', 'Perigosa'],
      datasets: [{
        data: [0, 0, 0, 0, 0],
        backgroundColor: [
          '#4CAF50', '#FFEB3B', '#FF9800', '#F44336', '#673AB7'
        ]
      }]
    },
    options: {
      cutout: '70%'
    }
  });
  
  const level = Math.min(Math.floor(aqi / 50), 4);
  airChart.data.datasets[0].data[level] = 1;
  airChart.update();
}

// Event Listeners
document.getElementById('fetchFires').addEventListener('click', () => {
  const region = document.getElementById('regionSelect').value || currentRegion;
  fetchFiresByRegion(region);
});

document.querySelectorAll('.region-buttons button').forEach(btn => {
  btn.addEventListener('click', () => {
    currentRegion = btn.dataset.region;
    document.getElementById('regionSelect').value = currentRegion;
    fetchFiresByRegion(currentRegion);
  });
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  fetchFiresByRegion(currentRegion);
});
