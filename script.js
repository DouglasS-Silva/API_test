// Variáveis globais
let firesChart = null;
let airChart = null;
let map = null;
let currentRegion = 'Norte';

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
    
    // Filtra por região
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
        ${error.message}
      </div>
    `;
  }
}

// API Qualidade do Ar
document.getElementById('fetchAir').addEventListener('click', async () => {
  const [city, state] = document.getElementById('citySelect').value.split(',');
  const resultDiv = document.getElementById('airData');
  resultDiv.innerHTML = '<div class="loading"></div> Buscando dados de qualidade do ar...';
  
  try {
    const apiKey = '88728331-dee0-40ae-89b4-b267cbc9e0de'; // Substitua por sua chave
    const url = `http://api.airvisual.com/v2/city?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&country=Brazil&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok || data.status === 'fail') {
      throw new Error(data.data?.message || 'Erro na API');
    }
    
    const pollution = data.data.current.pollution;
    const aqi = pollution.aqius;
    const level = getAqiLevel(aqi);
    const color = getAqiColor(aqi);
    
    resultDiv.innerHTML = `
      <div class="air-quality-card" style="background:${color}">
        <h3>${city}, ${state}</h3>
        <div class="aqi-value">${aqi}</div>
        <div class="aqi-level">${level}</div>
        <div class="details">
          <p>Poluente: ${pollution.mainus || 'Não especificado'}</p>
          <p>Atualizado: ${new Date(pollution.ts).toLocaleString()}</p>
        </div>
      </div>
    `;
    
    updateAirChart(aqi);
    
  } catch (error) {
    resultDiv.innerHTML = `
      <div class="error">
        Falha ao buscar dados de qualidade do ar:<br>
        ${error.message}
      </div>
    `;
  }
});

// Funções auxiliares
function getAqiLevel(aqi) {
  if (aqi <= 50) return 'Boa 🌱';
  if (aqi <= 100) return 'Moderada 😐';
  if (aqi <= 150) return 'Ruim para grupos sensíveis 😷';
  if (aqi <= 200) return 'Ruim 😨';
  if (aqi <= 300) return 'Muito Ruim ☠️';
  return 'Perigosa ⚠️';
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
