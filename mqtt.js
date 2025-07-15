const broker = 'wss://test.mosquitto.org:8081';
const topic = localStorage.getItem('mqtt_topic');

const options = {
  clientId: 'dashboard_' + Math.random().toString(16).substr(2, 8),
  clean: true
};

const client = mqtt.connect(broker, options);
const maxPoints = 20;

const datasets = {};
const charts = {};

const cardsContainer = document.getElementById('cardsContainer');
const chartsContainer = document.getElementById('chartsContainer');
const primaryChartContainer = document.getElementById('primaryChartContainer');

let firstParam = null;   // Track the first parameter

client.on('connect', () => {
  console.log('✅ Connected to MQTT');
  client.subscribe(topic);
});

client.on('message', (t, msg) => {
  if (t === topic) {
    try {
      const data = JSON.parse(msg.toString());

      Object.keys(data).forEach(param => {
        if (!datasets[param]) {
          datasets[param] = [];
          createCard(param);

          if (!firstParam) {
            firstParam = param;
            charts[param] = createChartDynamic(param, true);   // full-width chart
          } else {
            charts[param] = createChartDynamic(param, false);  // normal grid chart
          }
        }

        updateUI(param, data[param]);
        updateChart(param, data[param]);
      });

    } catch (err) {
      console.error("❌ JSON parse error:", err);
    }
  }
});

function createCard(param) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div class="label">${param}</div>
    <div id="${param}_value" class="value">--</div>
  `;
  cardsContainer.appendChild(card);
}

function createChartDynamic(param, isPrimary) {
  const container = document.createElement('div');
  const canvasId = `chart_${param}`;
  container.innerHTML = `<canvas id="${canvasId}"></canvas>`;

  if (isPrimary) {
    primaryChartContainer.appendChild(container);
  } else {
    chartsContainer.appendChild(container);
  }

  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: param,
        data: [],
        borderColor: getRandomColor(),
        backgroundColor: 'rgba(255,255,255,0.05)',
        fill: true,
        tension: 0.4,
        pointRadius: 2
      }]
    },
    options: {
      plugins: {
        legend: { labels: { color: '#fff' } },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${param}: ${context.parsed.y}`;
            }
          }
        }
      },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { display: false },
        y: { beginAtZero: true, ticks: { color: '#fff' } }
      }
    }
  });
}

function updateUI(param, value) {
  const elem = document.getElementById(`${param}_value`);
  if (elem) elem.innerText = value;
}

function updateChart(param, value) {
  const timestamp = new Date().toLocaleTimeString();
  datasets[param].push({ time: timestamp, value });
  if (datasets[param].length > maxPoints) datasets[param].shift();

  const chart = charts[param];
  chart.data.labels.push(timestamp);
  if (chart.data.labels.length > maxPoints) chart.data.labels.shift();

  chart.data.datasets[0].data = datasets[param].map(d => d.value);
  chart.update();
}

function getRandomColor() {
  return `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;
}

function updateClock() {
  const now = new Date();
  const dateString = now.toLocaleDateString('en-IN', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });
  const timeString = now.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  document.getElementById('date').innerText = dateString;
  document.getElementById('clock').innerText = timeString;
}
setInterval(updateClock, 1000);
updateClock();
