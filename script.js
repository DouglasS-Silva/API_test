// Variáveis para os gráficos
let firesChart = null;
let airChart = null;

// 1. Teste API Queimadas (NASA FIRMS)
document.getElementById('testFires').addEventListener('click', async () => {
  const resultDiv = document.getElementById('firesResult');
  resultDiv.innerHTML = '<div class="loading"></div> Buscando dados de queimadas...';
  
  try {
    const apiKey = '1470d8fd6a62ad792549e276f5653cea';
    const country = 'BRA';
    const url = `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${apiKey}/VIIRS_SNPP_NRT/${country}/1`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    
    const data = await response.text();
    const lines = data.split('\n').slice(1).filter(line => line.trim() !== '');
    const fireCount = lines.length;
    
    // Mostra resultados
    resultDiv.innerHTML = `
      <h3>Dados de Queimadas</h3>
      <p>Total de focos recentes: <strong>${fireCount}</strong></p>
      <p>Últimos 5 focos:</p>
      <ul>
        ${lines.slice(0, 5).map(line => {
          const [country, lat, long, brightness] = line.split(',');
          return `<li>Lat: ${lat}, Long: ${long} (${brightness}°C)</li>`;
        }).join('')}
      </ul>
    `;
    
    // Atualiza gráfico
    updateFiresChart(fireCount);
    
  } catch (error) {
    resultDiv.innerHTML = `
      <div class="error">
        Falha ao buscar dados de queimadas:<br>
        ${error.message}
      </div>
    `;
    console.error('Erro NASA FIRMS:', error);
  }
});

// 2. Teste API Qualidade do Ar (IQAir)
document.getElementById('testAir').addEventListener('click', async () => {
  const [city, state] = document.getElementById('citySelect').value.split(',');
  const resultDiv = document.getElementById('airResult');
  resultDiv.innerHTML = '<div class="loading"></div> Buscando dados de qualidade do ar...';
  
  try {
    // IMPORTANTE: Substitua por sua chave API válida
    const apiKey = '88728331-dee0-40ae-89b4-b267cbc9e0de'; 
    const url = `http://api.airvisual.com/v2/city?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&country=Brazil&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok || data.status === 'fail') {
      throw new Error(data.data?.message || 'Erro na API');
    }
    
    const aqi = data.data.current.pollution.aqius;
    const level = getAqiLevel(aqi);
    const color = getAqiColor(aqi);
    
    // Mostra resultados
    resultDiv.innerHTML = `
      <div style="background: ${color}; padding: 15px; border-radius: 8px; color: white;">
        <h3>Qualidade do Ar em ${city}, ${state}</h3>
        <p style="font-size: 2rem; margin: 10px 0;">AQI: <strong>${aqi}</strong></p>
        <p style="font-size: 1.2rem;">Nível: <strong>${level}</strong></p>
      </div>
    `;
    
    // Atualiza gráfico
    updateAirChart(aqi);
    
  } catch (error) {
    resultDiv.innerHTML = `
      <div class="error">
        Falha ao buscar dados de qualidade do ar:<br>
        ${error.message}<br><br>
        <small>Certifique-se de usar uma chave API válida do IQAir</small>
      </div>
    `;
    console.error('Erro IQAir:', error);
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
  
  // Destaca o nível atual
  const level = Math.min(Math.floor(aqi / 50), 4);
  airChart.data.datasets[0].data[level] = 1;
  airChart.update();
}