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
const historyPoints = document.getElementById("history-points");

// Chart.js instance
let myChart = null;

function formatMoney(value) {
  if (typeof value !== "number") {
    return "Chưa có";
  }
  return value.toLocaleString("vi-VN") + "đ";
}

function formatDate(value) {
  if (!value) {
    return "Chưa cập nhật";
  }
  const date = new Date(value);
  return date.toLocaleString("vi-VN");
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
  const url = API_BASE_URL + path;
  
  const response = await fetch(url, {
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
    resultsBody.innerHTML = `<tr><td colspan="5"><div class="empty"><i class="ph ph-magnifying-glass empty-icon"></i><span>Chưa có dữ liệu.</span></div></td></tr>`;
    return;
  }

  let html = "";

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const analysis = item.analysis || {};
    const hasPrice = item.success !== false && (item.price || item.price_value);
    const storageText = item.storage_status === "saved" ? "Đã lưu MongoDB" : "Chưa lưu MongoDB";
    const priceText = hasPrice ? escapeHtml(item.price || formatMoney(item.price_value)) : "Thất bại";
    const errorText = hasPrice ? "Tồn kho: " + escapeHtml(item.availability || "unknown") : escapeHtml(item.error);

    html += `
      <tr>
        <td>
          <div class="product-name">${escapeHtml(item.product_name || "Không có tên sản phẩm")}</div>
          <span class="sub"><i class="ph ph-storefront"></i> ${escapeHtml(item.platform)} - ${formatDate(item.scraped_at)}</span>
          <a class="product-url" href="${escapeHtml(item.url)}" target="_blank"><i class="ph ph-link-simple"></i> Mở link</a>
        </td>
        <td>
          <div class="price-main">${priceText}</div>
          <span class="sub"><i class="ph ph-package"></i> ${errorText}</span>
          <span class="sub"><i class="ph ph-database"></i> ${storageText}</span>
        </td>
        <td>
          <span class="badge ${item.buy_signal || "unknown"}">${getSignalText(item.buy_signal)}</span>
          <span class="analysis-note">Thấp nhất: ${formatMoney(analysis.low_price)}<br/>Trung bình: ${formatMoney(analysis.average_price)}</span>
        </td>
        <td>
          <div class="target-box">
            <span class="badge ${item.alert_hit ? "good glow-badge" : "unknown"}">${item.target_price ? "Target " + formatMoney(item.target_price) : "Chưa có target"}</span>
            <input type="number" placeholder="Mức giá mong muốn" data-target-price />
            <input type="email" placeholder="Email nhận cảnh báo" data-target-email />
            <button class="mini-btn" data-save-target><i class="ph ph-floppy-disk"></i> Lưu Target</button>
          </div>
        </td>
        <td>
          <button class="secondary-btn" style="padding: 10px 16px; font-size: 0.9rem;"
            data-history-url="${escapeHtml(item.url)}"
            data-product-name="${escapeHtml(item.product_name)}"
            data-platform="${escapeHtml(item.platform)}"><i class="ph ph-chart-line-up"></i> Xem lịch sử</button>
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
    watchlistElement.innerHTML = `<div class="empty"><i class="ph ph-bookmark-simple empty-icon"></i><span>Chưa có target nào.</span></div>`;
    return;
  }

  let html = "";
  for (let item of items) {
    html += `
      <article class="watch-item">
        <h3>${escapeHtml(item.product_name || item.platform || "Sản phẩm")}</h3>
        <p><a href="${escapeHtml(item.url)}" target="_blank" style="color: inherit; text-decoration: none;">${escapeHtml(item.url)}</a></p>
        <p>Target: <strong style="font-family: var(--font-heading)">${formatMoney(item.target_price)}</strong></p>
        <p>Email: ${escapeHtml(item.email || "Chưa nhập")}</p>
      </article>
    `;
  }
  watchlistElement.innerHTML = html;
}

async function runScan() {
  const urls = getUrls();
  if (urls.length === 0) {
    alert("Hãy nhập ít nhất 1 URL.");
    return;
  }

  scanButton.disabled = true;
  scanButton.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Đang quét...`;

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
    console.error(error);
    alert("Đã xảy ra lỗi khi quét dữ liệu.");
  }

  scanButton.disabled = false;
  scanButton.innerHTML = `<i class="ph ph-play-circle"></i> Bắt đầu quét`;
}

async function loadHistory(url, productName) {
  const data = await callApi("/api/history?url=" + encodeURIComponent(url) + "&limit=30");
  const history = data.history || [];

  if (history.length === 0) {
    chartShell.classList.add("hidden");
    chartEmpty.classList.remove("hidden");
    chartEmpty.querySelector("span").textContent = "Chưa có lịch sử giá.";
    return;
  }

  chartEmpty.classList.add("hidden");
  chartShell.classList.remove("hidden");
  chartTitle.textContent = productName || "Lịch sử giá";
  chartSubtitle.textContent = url;

  const prices = history.map((item) => item.price_value).filter((value) => typeof value === "number");
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  chartRange.textContent = formatMoney(min) + " - " + formatMoney(max);

  // Render Chart.js
  const ctx = document.getElementById("history-chart-canvas").getContext("2d");
  
  if (myChart) {
    myChart.destroy();
  }

  const labels = history.map(item => {
    const d = new Date(item.scraped_at);
    return d.toLocaleDateString('vi-VN') + " " + d.getHours() + ":" + String(d.getMinutes()).padStart(2, '0');
  }).reverse(); // API might return descending, so reverse for chart left-to-right

  const chartData = history.map(item => item.price_value).reverse();

  // Create gradient for chart fill
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(14, 165, 233, 0.5)'); // accent-primary with opacity
  gradient.addColorStop(1, 'rgba(14, 165, 233, 0.0)');

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Mức giá',
        data: chartData,
        borderColor: '#0ea5e9', // accent-primary
        backgroundColor: gradient,
        borderWidth: 3,
        pointBackgroundColor: '#8b5cf6', // accent-secondary
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4 // Smooth curves
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          titleFont: { family: 'Inter', size: 13 },
          bodyFont: { family: 'Inter', size: 14, weight: 'bold' },
          padding: 12,
          cornerRadius: 8,
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
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#9ca3af', font: { family: 'Inter' }, maxTicksLimit: 8 }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#9ca3af',
            font: { family: 'Inter' },
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

  // Render recent history points below chart
  historyPoints.innerHTML = history
    .slice(0, 8) // Get top 8 recent
    .map((item) => `
      <article class="history-card">
        <strong>${formatMoney(item.price_value)}</strong>
        <div>${formatDate(item.scraped_at)}</div>
      </article>`)
    .join("");
}

async function saveTarget(button) {
  const row = button.closest("tr");
  const infoButton = row.querySelector("[data-history-url]");
  const priceInput = row.querySelector("[data-target-price]");
  const emailInput = row.querySelector("[data-target-email]");

  button.disabled = true;
  button.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Đang lưu...`;

  try {
    await callApi(
      "/api/watchlist?platform=" +
        encodeURIComponent(infoButton.dataset.platform) +
        "&product_name=" +
        encodeURIComponent(infoButton.dataset.productName),
      {
        method: "POST",
        body: JSON.stringify({
          url: infoButton.dataset.historyUrl,
          target_price: Number(priceInput.value),
          email: emailInput.value,
        }),
      },
    );

    await loadWatchlist();
    // Simulate refresh row UI by reloading overview
    await loadOverview();
    alert("Đã lưu target thành công.");
  } catch (error) {
    alert("Lỗi khi lưu target.");
  }

  button.disabled = false;
  button.innerHTML = `<i class="ph ph-floppy-disk"></i> Lưu Target`;
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  await runScan();
});

sampleButton.addEventListener("click", function () {
  urlInput.value = sampleUrls.join("\n");
});

resultsBody.addEventListener("click", async function (event) {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  if (button.dataset.historyUrl) {
    // Scroll to chart
    chartShell.parentElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
    await loadHistory(button.dataset.historyUrl, button.dataset.productName);
  }

  if (button.hasAttribute("data-save-target")) {
    await saveTarget(button);
  }
});

loadOverview();
loadWatchlist();
