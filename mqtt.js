const broker = 'wss://test.mosquitto.org:8081';
const topic = localStorage.getItem('mqtt_topic');

const options = {
  clientId: 'dashboard_' + Math.random().toString(16).substr(2, 8),
  clean: true
};

const client = mqtt.connect(broker, options);
const maxPoints = 20;

const datasets = {
  pressure: [],
  vibration: [],
  temperature: [],
  obstruction: []
};

const chartPressure = createChart('chartPressure', 'Pressure (mmHg)', '#00d084', 'rgba(0,208,132,0.2)', 'mmHg');
const chartVibration = createChart('chartVibration', 'Vibration', '#f39c12', 'rgba(243, 156, 18, 0.2)', '');
const chartTemperature = createChart('chartTemperature', 'Temperature (°C)', '#3498db', 'rgba(52, 152, 219, 0.2)', '°C');
const chartObstruction = createChart('chartObstruction', 'Obstruction (%)', '#e74c3c', 'rgba(231, 76, 60, 0.2)', '%');

function createChart(canvasId, label, borderColor, backgroundColor, unit) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: label,
        data: [],
        borderColor: borderColor,
        backgroundColor: backgroundColor,
        fill: true,
        tension: 0.4,
        pointRadius: 2
      }]
    },
    options: {
      layout: { padding: { top: 30, bottom: 10 } },
      plugins: {
        legend: {
          labels: {
            color: '#fff',
            font: { size: 16 },
            padding: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${label}: ${context.parsed.y} ${unit}`;
            }
          }
        }
      },
      interaction: { mode: 'index', intersect: false },
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
  client.subscribe(topic);
});

client.on('message', (t, msg) => {
  if (t === topic) {
    try {
      const data = JSON.parse(msg.toString());

      updateUI('pressure', data.pressure);
      updateUI('vibration', data.vibration);
      updateUI('temperature', data.temperature);
      updateUI('flow', data.obstruction);

      updateChart(chartPressure, datasets.pressure, data.pressure);
      updateChart(chartVibration, datasets.vibration, data.vibration);
      updateChart(chartTemperature, datasets.temperature, data.temperature);
      updateChart(chartObstruction, datasets.obstruction, data.obstruction);
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
  dataset.push({ time: timestamp, value });
  if (dataset.length > maxPoints) dataset.shift();

  chart.data.labels.push(timestamp);
  if (chart.data.labels.length > maxPoints) chart.data.labels.shift();

  chart.data.datasets[0].data = dataset.map(d => d.value);
  chart.update();
}

// Clock
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

// ================= CSV EXPORT BUTTON + DIALOG =================
const exportBtn = document.createElement('button');
exportBtn.innerText = '📥 Export CSV';
exportBtn.style.cssText = `
  display: block;
  margin: 40px auto 20px auto;
  padding: 12px 24px;
  background: #3a5f3a;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: normal;
  font-size: 16px;
  z-index: 10;
`;
document.body.insertAdjacentElement('beforeend', exportBtn);

const modalHTML = `
  <div id="csvModal" style="
    display: none;
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.7);
    justify-content: center;
    align-items: center;
    z-index: 9999;
    font-family: 'Inter', sans-serif;
  ">
    <div id="csvDialogBox" style="
      background: #1e1e2f;
      padding: 25px;
      border-radius: 10px;
      text-align: center;
      color: #fff;
      box-shadow: 0 0 20px rgba(0,0,0,0.3);
      min-width: 300px;
    ">
      <h3 style="margin-bottom: 15px;">Select number of readings</h3>
      <input id="csvCount" type="number" min="1" max="${maxPoints}" value="5" style="padding: 8px 12px; border-radius: 6px; border: none; margin-bottom: 15px; width: 80px;"/><br/>
      <button onclick="downloadCSV()" style="padding: 10px 20px; background: #00d084; color: #1e1e2f; font-weight: bold; border: none; border-radius: 6px; cursor: pointer;">Download</button>
    </div>
  </div>
`;
document.body.insertAdjacentHTML('beforeend', modalHTML);

const csvModal = document.getElementById('csvModal');
const csvDialogBox = document.getElementById('csvDialogBox');

exportBtn.onclick = (e) => {
  e.stopPropagation(); // Prevent bubbling to the document click handler
  csvModal.style.display = 'flex';
};

// Hide modal when clicking outside the dialog box
document.addEventListener('click', (e) => {
  if (csvModal.style.display === 'flex') {
    const isClickInsideDialog = csvDialogBox.contains(e.target);
    const isClickOnExportBtn = exportBtn.contains(e.target);

    if (!isClickInsideDialog && !isClickOnExportBtn) {
      csvModal.style.display = 'none';
    }
  }
});


window.downloadCSV = () => {
  const count = parseInt(document.getElementById('csvCount').value) || 5;
  const rows = [['Time', 'Pressure', 'Vibration', 'Temperature', 'Obstruction']];

  for (let i = -count; i < 0; i++) {
    const p = datasets.pressure.at(i);
    const v = datasets.vibration.at(i);
    const t = datasets.temperature.at(i);
    const o = datasets.obstruction.at(i);
    if (p && v && t && o) {
      rows.push([p.time, p.value, v.value, t.value, o.value]);
    }
  }

  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `mqtt_data_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  document.getElementById('csvModal').style.display = 'none';
};
