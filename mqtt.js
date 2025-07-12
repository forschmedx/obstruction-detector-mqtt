const broker = 'wss://test.mosquitto.org:8081';
const topic = localStorage.getItem('mqtt_topic');

if (!topic) {
  alert("❗ MQTT topic not found. Redirecting...");
  window.location.href = "index.html";
}

const options = {
  clientId: 'dashboard_' + Math.random().toString(16).substr(2, 8),
  clean: true
};

const client = mqtt.connect(broker, options);

// Store last 20 values
const maxPoints = 20;

const datasets = {
  pressure: [],
  vibration: [],
  temperature: [],
  obstruction: []
};

// Create Charts
const chartPressure = createChart('chartPressure', 'Pressure (mmHg)', '#00d084', 'rgba(0,208,132,0.2)');
const chartVibration = createChart('chartVibration', 'Vibration', '#f39c12', 'rgba(243, 156, 18, 0.2)');
const chartTemperature = createChart('chartTemperature', 'Temperature (°C)', '#3498db', 'rgba(52, 152, 219, 0.2)');
const chartObstruction = createChart('chartObstruction', 'Obstruction (%)', '#e74c3c', 'rgba(231, 76, 60, 0.2)');

function createChart(canvasId, label, borderColor, backgroundColor) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label,
        data: [],
        borderColor,
        backgroundColor,
        fill: true,
        tension: 0.4,
        pointRadius: 2
      }]
    },
    options: {
      layout: {
        padding: { top: 30, bottom: 10 }
      },
      plugins: {
        legend: {
          labels: {
            color: '#fff',
            font: { size: 16 },
            padding: 20
          }
        }
      },
      scales: {
        x: { display: false },
        y: {
          beginAtZero: true,
          ticks: { color: '#fff' }
        }
      }
    }
  });
}

client.on('connect', () => {
  console.log('✅ Connected to MQTT');
  client.subscribe(topic, err => {
    if (err) console.error("❌ Subscription error:", err);
    else console.log("📡 Subscribed to:", topic);
  });
});

client.on('message', (t, msg) => {
  if (t === topic) {
    try {
      const data = JSON.parse(msg.toString());

      if (data.pressure !== undefined) {
        updateUI('pressure', data.pressure);
        updateChart(chartPressure, datasets.pressure, data.pressure);
      }

      if (data.vibration !== undefined) {
        updateUI('vibration', data.vibration);
        updateChart(chartVibration, datasets.vibration, data.vibration);
      }

      if (data.temperature !== undefined) {
        updateUI('temperature', data.temperature);
        updateChart(chartTemperature, datasets.temperature, data.temperature);
      }

      const obstructionVal = data.obstruction ?? data.flow;
      if (obstructionVal !== undefined) {
        updateUI('flow', obstructionVal);
        updateChart(chartObstruction, datasets.obstruction, obstructionVal);
      }

    } catch (err) {
      console.error("❌ JSON parse error:", err);
    }
  }
});

function updateUI(id, value) {
  document.getElementById(id).innerText = value;
}

function updateChart(chart, dataset, value) {
  const timestamp = new Date().toLocaleTimeString();
  dataset.push(value);
  if (dataset.length > maxPoints) dataset.shift();

  chart.data.labels.push(timestamp);
  if (chart.data.labels.length > maxPoints) chart.data.labels.shift();

  chart.data.datasets[0].data = [...dataset];
  chart.update();
}

// Live Date and Clock
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
