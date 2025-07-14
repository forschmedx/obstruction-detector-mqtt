const broker = 'wss://test.mosquitto.org:8081';
const topic = localStorage.getItem('mqtt_topic');

const options = {
  clientId: 'dashboard_' + Math.random().toString(16).substr(2, 8),
  clean: true
};

const client = mqtt.connect(broker, options);
const maxPoints = 20;

const datasets = {};  // Dynamic datasets
const charts = {};    // Dynamic chart instances

const cardsContainer = document.getElementById('cardsContainer');
const chartsContainer = document.getElementById('chartsContainer');

// MQTT connect
client.on('connect', () => {
  console.log('✅ Connected to MQTT');
  client.subscribe(topic);
});

// MQTT message
client.on('message', (t, msg) => {
  if (t === topic) {
    try {
      const data = JSON.parse(msg.toString());

      Object.keys(data).forEach(param => {
        if (!datasets[param]) {
          // First-time: create card and chart
          datasets[param] = [];
          createCard(param);
          charts[param] = createChartDynamic(param);
        }

        updateUI(param, data[param]);
        updateChart(param, data[param]);
      });

    } catch (err) {
      console.error("❌ JSON parse error:", err);
    }
  }
});

// Create Card
function createCard(param) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div class="label">${param}</div>
    <div id="${param}_value" class="value">--</div>
  `;
  cardsContainer.appendChild(card);
}

// Create Chart
function createChartDynamic(param) {
  const container = document.createElement('div');
  const canvasId = `chart_${param}`;
  container.innerHTML = `<canvas id="${canvasId}"></canvas>`;
  chartsContainer.appendChild(container);

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

// Update UI Card
function updateUI(param, value) {
  document.getElementById(`${param}_value`).innerText = value;
}

// Update Chart
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

// Random Color for Charts
function getRandomColor() {
  return `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;
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
window.addEventListener('DOMContentLoaded', () => {
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

  exportBtn.onclick = () => {
    const modal = document.getElementById('csvModal');
    modal.style.display = 'flex';

    setTimeout(() => {
      function handleOutsideClick(e) {
        const dialogBox = document.getElementById('csvDialogBox');
        if (!dialogBox.contains(e.target)) {
          modal.style.display = 'none';
          document.removeEventListener('click', handleOutsideClick);
        }
      }
      document.addEventListener('click', handleOutsideClick);
    }, 10);
  };
});

// ================= Download CSV =================
window.downloadCSV = () => {
  const count = parseInt(document.getElementById('csvCount').value) || 5;
  const paramList = Object.keys(datasets);

  const headerRow = ['Time', ...paramList];
  const rows = [headerRow];

  const maxLength = Math.max(...paramList.map(p => datasets[p].length));

  for (let i = Math.max(0, maxLength - count); i < maxLength; i++) {
    const row = [];
    const sampleTime = datasets[paramList[0]][i]?.time || '';
    row.push(sampleTime);

    paramList.forEach(param => {
      const value = datasets[param][i]?.value ?? '';
      row.push(value);
    });

    rows.push(row);
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
