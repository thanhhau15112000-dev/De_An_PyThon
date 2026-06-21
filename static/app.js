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
const historyChart = document.getElementById("history-chart");
const historyPoints = document.getElementById("history-points");

function formatMoney(value) {
  if (typeof value !== "number") {
    return "Chua co";
  }
  return value.toLocaleString("vi-VN") + "d";
}

function formatDate(value) {
  if (!value) {
    return "Chua cap nhat";
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

async function callApi(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return await response.json();
}

function getSignalText(signal) {
  if (signal === "good") {
    return "Mua ngay";
  }
  if (signal === "high") {
    return "Khong mua";
  }
  if (signal === "watch") {
    return "Cho doi";
  }
  return "Chua ro";
}

function renderResults(items) {
  if (items.length === 0) {
    resultsBody.innerHTML = `<tr><td colspan="5"><div class="empty">Chua co du lieu.</div></td></tr>`;
    return;
  }

  let html = "";

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const analysis = item.analysis || {};
    const hasPrice = item.success !== false && (item.price || item.price_value);
    const storageText = item.storage_status === "saved" ? "Da luu MongoDB" : "Chua luu MongoDB";
    const priceText = hasPrice ? escapeHtml(item.price || formatMoney(item.price_value)) : "That bai";
    const errorText = hasPrice ? "Ton kho: " + escapeHtml(item.availability || "unknown") : escapeHtml(item.error);

    html += `
      <tr>
        <td>
          <div class="product-name">${escapeHtml(item.product_name || "Khong co ten san pham")}</div>
          <span class="sub">${escapeHtml(item.platform)} - ${formatDate(item.scraped_at)}</span>
          <a class="product-url" href="${escapeHtml(item.url)}" target="_blank">${escapeHtml(item.url)}</a>
        </td>
        <td>
          <div class="price-main">${priceText}</div>
          <span class="sub">${errorText}</span>
          <span class="sub">${storageText}</span>
        </td>
        <td>
          <span class="badge ${item.buy_signal || "unknown"}">${getSignalText(item.buy_signal)}</span>
          <span class="analysis-note">${escapeHtml(item.note || analysis.note || "Chua co phan tich.")}</span>
          <span class="analysis-note">Thap nhat: ${formatMoney(analysis.low_price)} - Trung binh: ${formatMoney(analysis.average_price)}</span>
        </td>
        <td>
          <div class="target-box">
            <span class="badge ${item.alert_hit ? "good" : "unknown"}">${item.target_price ? "Target " + formatMoney(item.target_price) : "Chua co target"}</span>
            <input type="number" placeholder="Target price" data-target-price />
            <input type="email" placeholder="Email nhan canh bao" data-target-email />
            <button class="mini" data-save-target>Luu target</button>
          </div>
        </td>
        <td>
          <button class="mini secondary"
            data-history-url="${escapeHtml(item.url)}"
            data-product-name="${escapeHtml(item.product_name)}"
            data-platform="${escapeHtml(item.platform)}">Xem lich su</button>
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
    watchlistElement.innerHTML = `<div class="empty">Chua co target nao.</div>`;
    return;
  }

  let html = "";
  for (let item of items) {
    html += `
      <article class="watch-item">
        <h3>${escapeHtml(item.product_name || item.platform || "San pham")}</h3>
        <p>${escapeHtml(item.url)}</p>
        <p>Target: <strong>${formatMoney(item.target_price)}</strong></p>
        <p>Email: ${escapeHtml(item.email || "Chua nhap")}</p>
      </article>
    `;
  }
  watchlistElement.innerHTML = html;
}

async function runScan() {
  const urls = getUrls();
  if (urls.length === 0) {
    alert("Hay nhap it nhat 1 URL.");
    return;
  }

  scanButton.disabled = true;
  scanButton.textContent = "Dang quet...";

  const data = await callApi("/api/scan", {
    method: "POST",
    body: JSON.stringify({ urls: urls }),
  });

  renderResults(data.results || []);
  summaryTotal.textContent = data.summary.total;
  summarySuccess.textContent = data.summary.success;
  summaryFailed.textContent = data.summary.failed;

  scanButton.disabled = false;
  scanButton.textContent = "Bat dau quet";

  await loadWatchlist();
}

async function loadHistory(url, productName) {
  const data = await callApi("/api/history?url=" + encodeURIComponent(url) + "&limit=30");
  const history = data.history || [];

  if (history.length === 0) {
    chartShell.classList.add("hidden");
    chartEmpty.classList.remove("hidden");
    chartEmpty.textContent = "Chua co lich su gia.";
    return;
  }

  chartEmpty.classList.add("hidden");
  chartShell.classList.remove("hidden");
  chartTitle.textContent = productName || "Lich su gia";
  chartSubtitle.textContent = url;

  const prices = history.map((item) => item.price_value).filter((value) => typeof value === "number");
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  chartRange.textContent = formatMoney(min) + " - " + formatMoney(max);

  let points = "";
  for (let i = 0; i < prices.length; i++) {
    const x = 30 + i * (580 / Math.max(prices.length - 1, 1));
    const y = 210 - ((prices[i] - min) / Math.max(max - min, 1)) * 170;
    points += `${x},${y} `;
  }

  historyChart.innerHTML = `
    <polyline fill="none" stroke="#0f7f71" stroke-width="4" points="${points}" />
  `;

  historyPoints.innerHTML = history
    .slice(-8)
    .reverse()
    .map((item) => `<article class="history-card"><strong>${formatMoney(item.price_value)}</strong><div>${formatDate(item.scraped_at)}</div></article>`)
    .join("");
}

async function saveTarget(button) {
  const row = button.closest("tr");
  const infoButton = row.querySelector("[data-history-url]");
  const priceInput = row.querySelector("[data-target-price]");
  const emailInput = row.querySelector("[data-target-email]");

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
  alert("Da luu target.");
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
    await loadHistory(button.dataset.historyUrl, button.dataset.productName);
  }

  if (button.hasAttribute("data-save-target")) {
    await saveTarget(button);
  }
});

loadOverview();
loadWatchlist();
