const sampleUrls = [
  "https://cellphones.com.vn/iphone-15.html",
  "https://www.thegioididong.com/dtdd/iphone-15",
];

const form = document.getElementById("scan-form");
const urlInput = document.getElementById("url-input");
const scanButton = document.getElementById("scan-button");
const sampleButton = document.getElementById("sample-button");
const resultsBody = document.getElementById("results-body");
const watchlistElement = document.getElementById("watchlist");
const summaryTotal = document.getElementById("summary-total");
const summarySuccess = document.getElementById("summary-success");
const summaryFailed = document.getElementById("summary-failed");
const chartEmpty = document.getElementById("chart-empty");
const chartShell = document.getElementById("chart-shell");
const chartTitle = document.getElementById("chart-title");
const chartSubtitle = document.getElementById("chart-subtitle");
const chartRange = document.getElementById("chart-range");

let myChart = null;

function formatMoney(value) {
  if (typeof value !== "number") return "Chưa có";
  return value.toLocaleString("vi-VN") + "đ";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getUrls() {
  return urlInput.value
    .split("\n")
    .map((url) => url.trim())
    .filter((url) => url !== "");
}

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://127.0.0.1:8000"
  : "https://pricetracker-be.onrender.com";

async function callApi(endpoint, options = {}) {
  const path = endpoint.startsWith("/") ? endpoint : "/" + endpoint;
  const response = await fetch(API_BASE_URL + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return await response.json();
}

function getSignalText(signal) {
  if (signal === "good") return "Mua ngay";
  if (signal === "high") return "Không mua";
  if (signal === "watch") return "Chờ đợi";
  return "Chưa rõ";
}

function renderResults(items) {
  if (items.length === 0) {
    resultsBody.innerHTML = `<tr><td colspan="5"><div class="empty-state">Chưa có dữ liệu.</div></td></tr>`;
    return;
  }

  let html = "";
  for (let item of items) {
    const analysis = item.analysis || {};
    const hasPrice = item.success !== false && (item.price || item.price_value);
    const priceText = hasPrice ? escapeHtml(item.price || formatMoney(item.price_value)) : "Thất bại";

    html += `
      <tr>
        <td>
          <div class="item-title">${escapeHtml(item.product_name || "Không có tên sản phẩm")}</div>
          <div class="item-meta">
            <i class="ph ph-storefront"></i> ${escapeHtml(item.platform)}
          </div>
          <div class="item-meta" style="margin-top: 4px;">
            <a href="${escapeHtml(item.url)}" target="_blank"><i class="ph ph-link"></i> Mở link</a>
          </div>
        </td>
        <td>
          <div class="price-lg">${priceText}</div>
          <div class="status-row">
            Tồn kho: ${hasPrice ? escapeHtml(item.availability || "unknown") : escapeHtml(item.error)}
          </div>
        </td>
        <td>
          <span class="badge ${item.buy_signal || "unknown"}">${getSignalText(item.buy_signal)}</span>
          <div class="status-row" style="margin-top: 8px;">Thấp: ${formatMoney(analysis.low_price)}</div>
          <div class="status-row">TB: ${formatMoney(analysis.average_price)}</div>
        </td>
        <td>
          <div class="target-form">
            <span class="badge ${item.alert_hit ? "good" : "unknown"}">${item.target_price ? "Target: " + formatMoney(item.target_price) : "Chưa có target"}</span>
            <input type="number" class="target-input" placeholder="Giá mục tiêu" data-target-price />
            <input type="email" class="target-input" placeholder="Email nhận cảnh báo" data-target-email />
            <button class="btn btn-text" style="padding: 6px 0; justify-content: flex-start;" data-save-target>Lưu Target</button>
          </div>
        </td>
        <td class="text-right">
          <button class="btn btn-text"
            data-history-url="${escapeHtml(item.url)}"
            data-product-name="${escapeHtml(item.product_name)}">
            <i class="ph ph-chart-line-up"></i> Xem biểu đồ
          </button>
        </td>
      </tr>
    `;
  }
  resultsBody.innerHTML = html;
}

async function loadOverview() {
  const data = await callApi("/api/overview?limit=20");
  renderResults(data.items || []);
  summaryTotal.textContent = data.count || 0;
  summarySuccess.textContent = data.count || 0;
  summaryFailed.textContent = 0;
}

async function loadWatchlist() {
  const data = await callApi("/api/watchlist?limit=30");
  const items = data.items || [];

  if (items.length === 0) {
    watchlistElement.innerHTML = `<div class="empty-state">Chưa có mục tiêu giá nào.</div>`;
    return;
  }

  let html = "";
  for (let item of items) {
    html += `
      <div class="watch-card">
        <h3>${escapeHtml(item.product_name || item.platform || "Sản phẩm")}</h3>
        <a href="${escapeHtml(item.url)}" target="_blank" class="url">${escapeHtml(item.url)}</a>
        <div class="target-val">${formatMoney(item.target_price)}</div>
        <div class="email"><i class="ph ph-envelope-simple"></i> ${escapeHtml(item.email || "Chưa nhập email")}</div>
      </div>
    `;
  }
  watchlistElement.innerHTML = html;
}

async function runScan() {
  const urls = getUrls();
  if (urls.length === 0) return alert("Nhập ít nhất 1 URL.");

  scanButton.disabled = true;
  scanButton.textContent = "Đang quét...";

  try {
    const data = await callApi("/api/scan", {
      method: "POST",
      body: JSON.stringify({ urls: urls }),
    });

    renderResults(data.results || []);
    summaryTotal.textContent = data.summary.total;
    summarySuccess.textContent = data.summary.success;
    summaryFailed.textContent = data.summary.failed;
    await loadWatchlist();
  } catch (error) {
    alert("Lỗi khi quét dữ liệu.");
  }

  scanButton.disabled = false;
  scanButton.textContent = "Bắt đầu quét";
}

async function loadHistory(url, productName) {
  const data = await callApi("/api/history?url=" + encodeURIComponent(url) + "&limit=30");
  const history = data.history || [];

  if (history.length === 0) {
    chartShell.classList.add("hidden");
    chartEmpty.classList.remove("hidden");
    chartEmpty.querySelector("span").textContent = "Sản phẩm này chưa có lịch sử giá.";
    return;
  }

  chartEmpty.classList.add("hidden");
  chartShell.classList.remove("hidden");
  chartTitle.textContent = productName || "Lịch sử giá";
  chartSubtitle.textContent = url;
  chartSubtitle.href = url;

  const prices = history.map((item) => item.price_value).filter((value) => typeof value === "number");
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  chartRange.textContent = formatMoney(min) + " - " + formatMoney(max);

  const ctx = document.getElementById("history-chart-canvas").getContext("2d");
  if (myChart) myChart.destroy();

  const labels = history.map(item => {
    const d = new Date(item.scraped_at);
    return d.getDate() + '/' + (d.getMonth()+1) + ' ' + d.getHours() + ":" + String(d.getMinutes()).padStart(2, '0');
  }).reverse();

  const chartData = history.map(item => item.price_value).reverse();

  const gradient = ctx.createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, 'rgba(225, 29, 72, 0.2)'); // --primary
  gradient.addColorStop(1, 'rgba(225, 29, 72, 0)');

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        data: chartData,
        borderColor: '#E11D48',
        backgroundColor: gradient,
        borderWidth: 2,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#E11D48',
        pointBorderWidth: 2,
        pointRadius: 4,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          titleFont: { family: 'DM Sans', size: 13 },
          bodyFont: { family: 'DM Sans', size: 14, weight: 'bold' },
          padding: 12,
          cornerRadius: 6,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return context.parsed.y.toLocaleString('vi-VN') + 'đ';
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#6B7280', font: { family: 'DM Sans' }, maxTicksLimit: 6 }
        },
        y: {
          border: { display: false },
          grid: { color: '#F3F4F6' },
          ticks: {
            color: '#6B7280',
            font: { family: 'DM Sans' },
            callback: function(value) {
              if(value >= 1000000) return (value / 1000000).toLocaleString('vi-VN') + ' Tr';
              if(value >= 1000) return (value / 1000).toLocaleString('vi-VN') + ' K';
              return value;
            }
          }
        }
      }
    }
  });
}

async function saveTarget(button) {
  const row = button.closest("tr");
  const infoButton = row.querySelector("[data-history-url]");
  const priceInput = row.querySelector("[data-target-price]");
  const emailInput = row.querySelector("[data-target-email]");

  button.disabled = true;
  button.textContent = "Đang lưu...";

  try {
    await callApi("/api/watchlist?platform=auto&product_name=auto", {
        method: "POST",
        body: JSON.stringify({
          url: infoButton.dataset.historyUrl,
          target_price: Number(priceInput.value),
          email: emailInput.value,
        }),
      });
    await loadWatchlist();
    await loadOverview();
  } catch (error) {}

  button.disabled = false;
  button.textContent = "Lưu Target";
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  await runScan();
});

sampleButton.addEventListener("click", () => {
  urlInput.value = sampleUrls.join("\n");
});

resultsBody.addEventListener("click", async function (event) {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.historyUrl) {
    chartShell.parentElement.scrollIntoView({ behavior: "smooth", block: "start" });
    await loadHistory(button.dataset.historyUrl, button.dataset.productName);
  }

  if (button.hasAttribute("data-save-target")) {
    await saveTarget(button);
  }
});

loadOverview();
loadWatchlist();
