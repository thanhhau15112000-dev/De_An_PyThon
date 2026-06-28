const sampleUrls = [
  "https://hoanghamobile.com/dien-thoai/dien-thoai-xiaomi-poco-m7-6gb-128gb",
  "https://hoanghamobile.com/dong-ho-thong-minh/vong-deo-tay-thong-minh-xiaomi-band-10-khung-ceramic",
  "https://cellphones.com.vn/laptop-msi-prestige-13-ai-ukiyoe-edition-a2vmg-075vn.html",
  "https://cellphones.com.vn/laptop-lenovo-legion-5-15irx10-83ly00hqvn.html",
  "https://hoanghamobile.com/dien-thoai/oppo-a3-8gb-256gb",
  "https://cellphones.com.vn/macbook-air-15-m5-10-cpu-10-gpu-24gb-1tb.html",
  "https://cellphones.com.vn/macbook-pro-14-inch-m5-24gb-1tb.html",
  "https://hoanghamobile.com/dien-thoai-di-dong/nubia-neo-8gb-256gb-chinh-hang",
  "https://cellphones.com.vn/macbook-neo-13-a18-pro-6-cpu-5-gpu-8gb-256gb.html",
  "https://cellphones.com.vn/macbook-neo-13-a18-pro-6-cpu-5-gpu-8gb-512gb.html",
  "https://cellphones.com.vn/apple-macbook-air-13-m4-10cpu-10gpu-24gb-512gb-2025-sac-70w.html",
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
    .map((url) => url.replace(/^❌\s*/, "").replace(/^✅\s*/, "").trim())
    .filter((url) => url !== "");
}

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://127.0.0.1:8000"
  : "https://pricetracker-be.onrender.com";

async function callApi(endpoint, options = {}) {
  const path = endpoint.startsWith("/") ? endpoint : "/" + endpoint;
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = "Bearer " + token;

  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers: headers,
  });
  
  if (response.status === 401) {
    showAuthModal();
    throw new Error("Unauthorized");
  }
  
  return await response.json();
}

function getSignalText(signal) {
  if (signal === "good") return "Mua ngay";
  if (signal === "high") return "Không mua";
  if (signal === "watch") return "Chờ đợi";
  return "Chưa rõ";
}

function renderResults(items) {
  const tableEl = document.querySelector("table");
  if (items.length === 0) {
    if (tableEl) tableEl.classList.remove("has-data");
    resultsBody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="text-align: center;">Vui lòng nhập danh sách URL và tiến hành quét để xem kết quả.</div></td></tr>`;
    return;
  }

  if (tableEl) tableEl.classList.add("has-data");

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
          <div class="status-row" style="margin-top: 8px; white-space: nowrap;">Thấp: <strong>${formatMoney(analysis.low_price)}</strong></div>
          <div class="status-row" style="white-space: nowrap;">TB: <strong>${formatMoney(analysis.average_price)}</strong></div>
        </td>
        <td>
          <div class="target-form">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge ${item.alert_hit ? "good" : "unknown"}">${item.target_price ? "Target: " + formatMoney(item.target_price) : "Chưa có target"}</span>
              <button class="btn btn-text" style="padding: 4px; color: var(--primary);" data-toggle-target title="Cài đặt cảnh báo"><i class="ph ph-pencil-simple"></i></button>
            </div>
            <div class="target-inputs hidden" style="margin-top: 8px; display: flex; flex-direction: column; gap: 8px;">
              <input type="text" class="target-input" placeholder="Giá mục tiêu (VD: 1,500,000)" data-target-price />
              <button class="btn btn-text" style="padding: 6px 0; justify-content: flex-start; color: var(--primary);" data-save-target>Lưu</button>
            </div>
          </div>
        </td>
        <td style="text-align: center;">
          <button class="btn btn-text" style="color: var(--primary); white-space: nowrap;"
            data-ai-url="${escapeHtml(item.url)}"
            data-ai-product="${escapeHtml(item.product_name || "Sản phẩm")}">
            <i class="ph-fill ph-robot"></i> AI phân tích
          </button>
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
  
  // Đã bỏ auto fetch, khi nào user bấm xem phân tích mới fetch qua Chat API
}

const aiFab = document.getElementById("ai-fab");
const aiSidebar = document.getElementById("ai-sidebar");
const aiSidebarOverlay = document.getElementById("ai-sidebar-overlay");
const aiSidebarClose = document.getElementById("ai-sidebar-close");
const aiChatBody = document.getElementById("ai-chat-body");
const aiChatForm = document.getElementById("ai-chat-form");
const aiChatInput = document.getElementById("ai-chat-input");
const aiChatSubmit = document.getElementById("ai-chat-submit");

let currentChatUrl = null;
let currentChatProduct = null;
let chatHistory = [];

function toggleAiSidebar() {
  aiSidebar.classList.toggle("hidden");
  document.body.classList.toggle("sidebar-open");
}

aiFab.addEventListener("click", toggleAiSidebar);
aiSidebarClose.addEventListener("click", toggleAiSidebar);
// aiSidebarOverlay.addEventListener("click", toggleAiSidebar);

function renderChatMessages() {
  if (chatHistory.length === 0) {
    aiChatBody.innerHTML = `
      <div class="chat-empty-state">
        <i class="ph-fill ph-robot"></i>
        <p>Xin chào! Tôi có thể giúp bạn phân tích giá của sản phẩm nào?</p>
      </div>
    `;
    return;
  }
  
  let html = "";
  for (let msg of chatHistory) {
    let roleClass = msg.role === "user" ? "user" : "ai";
    let formatted = msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    html += `
      <div class="chat-message ${roleClass}">
        <div class="chat-bubble">${formatted}</div>
      </div>
    `;
  }
  aiChatBody.innerHTML = html;
  
  const lastMsgElement = aiChatBody.lastElementChild;
  if (lastMsgElement) {
    if (lastMsgElement.classList.contains("ai") && !lastMsgElement.innerHTML.includes("loading-dots")) {
      lastMsgElement.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      aiChatBody.scrollTop = aiChatBody.scrollHeight;
    }
  }
}

aiChatForm.addEventListener("submit", async function(e) {
  e.preventDefault();
  const text = aiChatInput.value.trim();
  if (!text || !currentChatUrl) return;
  
  aiChatInput.value = "";
  chatHistory.push({ role: "user", content: text });
  chatHistory.push({ role: "ai", content: "<span class='loading-dots'>Đang suy nghĩ</span>" });
  renderChatMessages();
  
  aiChatInput.disabled = true;
  aiChatSubmit.disabled = true;
  
  try {
    const apiHistory = chatHistory.slice(0, -2).map(msg => ({
      role: msg.role === "ai" ? "model" : "user",
      parts: msg.content
    }));
    
    const data = await callApi("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        url: currentChatUrl,
        product_name: currentChatProduct,
        message: text,
        history: apiHistory
      })
    });
    
    chatHistory.pop(); // Xóa loading
    if (data.reply) {
      chatHistory.push({ role: "ai", content: data.reply });
    } else {
      chatHistory.push({ role: "ai", content: "Lỗi: " + (data.error || "Không có phản hồi") });
    }
  } catch(err) {
    chatHistory.pop();
    chatHistory.push({ role: "ai", content: "Lỗi kết nối đến máy chủ AI." });
  }
  
  renderChatMessages();
  aiChatInput.disabled = false;
  aiChatSubmit.disabled = false;
  aiChatInput.focus();
});

async function loadOverview() {
  const data = await callApi("/api/overview?limit=20");
  renderResults(data.items || []);
}

async function loadWatchlist() {
  const token = localStorage.getItem("token");
  if (!token) {
    renderWatchlist({ items: [] });
    return;
  }
  try {
    const targets = await callApi("/api/watchlist");
    renderWatchlist(targets);
  } catch (err) {
    console.error("Watchlist fetch error", err);
    renderWatchlist({ items: [] });
  }
}

function renderWatchlist(data) {
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

    // Background Flash
    document.body.classList.remove('flash-green', 'flash-red', 'flash-yellow');
    void document.body.offsetWidth; // trigger reflow
    const total = data.summary.total;
    const success = data.summary.success;
    const failed = data.summary.failed;
    
    if (total > 0) {
      if (success === total) {
        document.body.classList.add('flash-green');
      } else if (failed === total) {
        document.body.classList.add('flash-red');
      } else {
        document.body.classList.add('flash-yellow');
      }
    }

    // Đánh dấu URL bị lỗi
    const currentLines = urlInput.value.split("\n");
    const newLines = [];
    for (let line of currentLines) {
      let trimmed = line.trim();
      if (!trimmed) {
        newLines.push(line);
        continue;
      }
      let cleanUrl = trimmed.replace(/^❌\s*/, "").replace(/^✅\s*/, "");
      let matchedResult = data.results.find(r => r.url === cleanUrl);
      
      if (matchedResult) {
        if (matchedResult.success === false || matchedResult.error) {
          newLines.push(`❌ ${cleanUrl}`);
        } else {
          newLines.push(cleanUrl); // Bỏ dấu lỗi nếu đã thành công
        }
      } else {
        newLines.push(trimmed);
      }
    }
    urlInput.value = newLines.join("\n");

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
  });

  const chartData = history.map(item => item.price_value);

  const gradient = ctx.createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, 'rgba(225, 29, 72, 0.2)'); // --primary
  gradient.addColorStop(1, 'rgba(225, 29, 72, 0)');

  const pointBackgrounds = chartData.map((_, i) => i === chartData.length - 1 ? '#E11D48' : '#FFFFFF');
  const pointRadii = chartData.map((_, i) => i === chartData.length - 1 ? 6 : 4);

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        data: chartData,
        borderColor: '#E11D48',
        backgroundColor: gradient,
        borderWidth: 2,
        pointBackgroundColor: pointBackgrounds,
        pointBorderColor: '#E11D48',
        pointBorderWidth: 2,
        pointRadius: pointRadii,
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

  const productName = infoButton.dataset.productName || "Sản phẩm";

  button.disabled = true;
  button.textContent = "Đang lưu...";

  try {
    await callApi(`/api/watchlist?platform=auto&product_name=${encodeURIComponent(productName)}`, {
        method: "POST",
        body: JSON.stringify({
          url: infoButton.dataset.historyUrl,
          target_price: Number(priceInput.value.replace(/\D/g, "")),
          email: ""
        }),
      });
    await loadWatchlist();
    
    // Cập nhật DOM trực tiếp thay vì loadOverview
    const badge = row.querySelector(".target-form .badge");
    badge.textContent = "Target: " + formatMoney(Number(priceInput.value.replace(/\D/g, "")));
    badge.className = "badge good";
    const inputsDiv = row.querySelector(".target-inputs");
    if (inputsDiv) inputsDiv.classList.add("hidden");
    
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

  if (button.hasAttribute("data-ai-url")) {
    const url = button.getAttribute("data-ai-url");
    const productName = button.getAttribute("data-ai-product");
    
    if (aiSidebar.classList.contains("hidden")) {
      toggleAiSidebar();
    }
    
    if (url !== currentChatUrl) {
      currentChatUrl = url;
      currentChatProduct = productName;
      chatHistory = [];
      
      chatHistory.push({ role: "ai", content: "<span class='loading-dots'>Đang phân tích lịch sử giá</span>" });
      renderChatMessages();
      aiChatInput.disabled = true;
      aiChatSubmit.disabled = true;
      
      callApi("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          url: url,
          product_name: productName,
          message: "Hãy phân tích lịch sử giá của sản phẩm này và cho tôi lời khuyên.",
          history: []
        })
      }).then(data => {
        chatHistory.pop();
        if (data.reply) {
          chatHistory.push({ role: "ai", content: data.reply });
        } else {
          chatHistory.push({ role: "ai", content: "Lỗi phân tích." });
        }
        renderChatMessages();
        aiChatInput.disabled = false;
        aiChatSubmit.disabled = false;
        aiChatInput.focus();
      }).catch(err => {
        chatHistory.pop();
        chatHistory.push({ role: "ai", content: "Lỗi kết nối máy chủ AI." });
        renderChatMessages();
      });
    }
  }

  if (button.hasAttribute("data-toggle-target")) {
    const inputsDiv = button.closest(".target-form").querySelector(".target-inputs");
    inputsDiv.classList.toggle("hidden");
  }

  if (button.hasAttribute("data-save-target")) {
    await saveTarget(button);
  }
});

resultsBody.addEventListener("input", function(event) {
  if (event.target.hasAttribute("data-target-price")) {
    let val = event.target.value.replace(/\D/g, "");
    if (val) {
      event.target.value = parseInt(val, 10).toLocaleString("vi-VN");
    } else {
      event.target.value = "";
    }
  }
});

// Auth Logic
const authStatus = document.getElementById("auth-status");
const authModalOverlay = document.getElementById("auth-modal-overlay");
const authClose = document.getElementById("auth-close");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authTitle = document.getElementById("auth-title");
const authSubmit = document.getElementById("auth-submit");
const authToggleText = document.getElementById("auth-toggle-text");
const authToggleBtn = document.getElementById("auth-toggle-btn");
const authError = document.getElementById("auth-error");
const captchaRefresh = document.getElementById("captcha-refresh");

let isLoginMode = true;
let captchaResult = 0;

function generateCaptcha() {
  const num1 = Math.floor(Math.random() * 10);
  const num2 = Math.floor(Math.random() * 10);
  captchaResult = num1 + num2;
  const captchaQuestion = document.getElementById("captcha-question");
  if (captchaQuestion) captchaQuestion.textContent = `${num1} + ${num2} =`;
  const captchaAnswer = document.getElementById("auth-captcha-answer");
  if (captchaAnswer) captchaAnswer.value = "";
}

function showAuthModal() {
  if (authModalOverlay) authModalOverlay.classList.remove("hidden");
  generateCaptcha();
}

function hideAuthModal() {
  if (authModalOverlay) authModalOverlay.classList.add("hidden");
  if (authError) authError.style.display = "none";
}

if (authClose) authClose.addEventListener("click", hideAuthModal);

if (authToggleBtn) {
  authToggleBtn.addEventListener("click", (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    authTitle.textContent = isLoginMode ? "Đăng nhập" : "Đăng ký";
    authSubmit.textContent = isLoginMode ? "Đăng nhập" : "Đăng ký";
    authToggleText.textContent = isLoginMode ? "Chưa có tài khoản?" : "Đã có tài khoản?";
    authToggleBtn.textContent = isLoginMode ? "Đăng ký ngay" : "Đăng nhập";
    const authConfirmGroup = document.getElementById("auth-confirm-group");
    const authConfirmPassword = document.getElementById("auth-confirm-password");
    if (authConfirmGroup) authConfirmGroup.style.display = isLoginMode ? "none" : "block";
    if (authConfirmPassword) authConfirmPassword.required = !isLoginMode;
    authError.style.display = "none";
  });
}

if (captchaRefresh) {
  captchaRefresh.addEventListener("click", generateCaptcha);
}

const togglePasswords = document.querySelectorAll(".toggle-password");
togglePasswords.forEach(icon => {
  icon.addEventListener("click", function() {
    const input = this.previousElementSibling;
    if (input.type === "password") {
      input.type = "text";
      this.classList.remove("ph-eye-slash");
      this.classList.add("ph-eye");
    } else {
      input.type = "password";
      this.classList.remove("ph-eye");
      this.classList.add("ph-eye-slash");
    }
  });
});

if (authForm) {
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const captchaAnswer = document.getElementById("auth-captcha-answer");
    if (captchaAnswer && parseInt(captchaAnswer.value, 10) !== captchaResult) {
      authError.textContent = "Kết quả phép toán không đúng!";
      authError.style.display = "block";
      generateCaptcha();
      return;
    }

    if (!isLoginMode) {
      const confirmPassword = document.getElementById("auth-confirm-password");
      if (confirmPassword && authPassword.value !== confirmPassword.value) {
        authError.textContent = "Mật khẩu nhập lại không khớp!";
        authError.style.display = "block";
        return;
      }
    }

    const endpoint = isLoginMode ? "/api/auth/login" : "/api/auth/register";
    
    // Save original text to restore later
    const originalBtnText = authSubmit.innerHTML;
    
    authSubmit.disabled = true;
    authSubmit.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Đang xử lý...`;
    authError.style.display = "none";
    try {
      const res = await fetch(API_BASE_URL + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail.value, password: authPassword.value })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Đăng nhập thất bại");
      }
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user_email", authEmail.value);
      hideAuthModal();
      checkAuthStatus();
      
      // Auto reload resources
      loadWatchlist();
    } catch (err) {
      authError.textContent = err.message === "Failed to fetch" ? "Lỗi kết nối máy chủ, vui lòng thử lại." : err.message;
      authError.style.display = "block";
      generateCaptcha();
    }
    authSubmit.disabled = false;
    authSubmit.innerHTML = originalBtnText;
  });
}

function showUpgradeModal() {
  document.getElementById("upgrade-modal-overlay").classList.remove("hidden");
}

function closeUpgradeModal() {
  document.getElementById("upgrade-modal").style.display = "none";
}

let checkUpgradeInterval = null;

async function checkoutSepay(tier) {
  const email = localStorage.getItem("user_email");
  const token = localStorage.getItem("token");
  
  if (!email || !token) {
    alert("Vui lòng đăng nhập lại!");
    return;
  }
  
  // Check current tier first to prevent instant success bug
  try {
    const res = await fetch(API_BASE_URL + "/api/me", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.tier === tier) {
        alert(`Bạn đang sử dụng gói ${tier.toUpperCase()} rồi!`);
        return;
      }
      if (data.tier === "max" && tier === "premium") {
        alert("Bạn đang sử dụng gói MAX cao cấp nhất rồi, không cần mua gói thấp hơn!");
        return;
      }
    }
  } catch (e) {}
  
  const amount = tier === "premium" ? 2000 : 2999;
  const description = `UPGRADE ${email}`;
  const bank = "MBBank";
  const acc = "010215112007";
  const holder = "LE THANH HAU";
  
  const qrUrl = `https://vietqr.app/img?bank=${bank}&acc=${acc}&amount=${amount}&des=${encodeURIComponent(description)}&template=compact&showinfo=true&holder=${encodeURIComponent(holder)}`;
  
  document.getElementById("qr-loading").style.display = "block";
  document.getElementById("qr-image").style.display = "none";
  document.getElementById("qr-image").src = qrUrl;
  document.getElementById("qr-description").textContent = description;
  
  document.getElementById("upgrade-packages").style.display = "none";
  document.getElementById("upgrade-qr").style.display = "block";

  // Start polling
  if (checkUpgradeInterval) clearInterval(checkUpgradeInterval);
  checkUpgradeInterval = setInterval(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(API_BASE_URL + "/api/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.tier === tier || (tier === 'premium' && data.tier === 'max')) {
          clearInterval(checkUpgradeInterval);
          
          const successOverlay = document.createElement("div");
          successOverlay.className = "sidebar-overlay";
          successOverlay.style.cssText = "z-index: 9999; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.8); padding: 20px;";
          successOverlay.innerHTML = `
            <div style="background: var(--surface); padding: 3rem 2rem; border-radius: 20px; text-align: center; width: 100%; max-width: 400px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); transform: scale(0.9); animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;">
              <div style="width: 80px; height: 80px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4);">
                <i class="ph-bold ph-check" style="color: white; font-size: 3rem;"></i>
              </div>
              <h2 style="margin: 0 0 10px 0; color: var(--text-main); font-size: 1.8rem;">Thành công!</h2>
              <p style="color: var(--text-muted); font-size: 1.05rem; margin-bottom: 2rem; line-height: 1.5;">Chúc mừng bạn đã nâng cấp thành công lên gói <b style="color: var(--primary); font-size: 1.1rem;">${data.tier.toUpperCase()}</b></p>
              <button class="btn btn-primary" style="width: 100%; justify-content: center; padding: 14px; font-size: 1.1rem; border-radius: 12px; font-weight: bold; box-shadow: 0 8px 16px rgba(var(--primary-rgb), 0.3);" onclick="window.location.reload()">Bắt đầu trải nghiệm ngay</button>
            </div>
            <style>
              @keyframes popIn {
                to { transform: scale(1); }
              }
            </style>
          `;
          document.body.appendChild(successOverlay);
        }
      }
    } catch (e) {}
  }, 3000);
}

function resetUpgradeModal() {
  if (checkUpgradeInterval) clearInterval(checkUpgradeInterval);
  document.getElementById("upgrade-packages").style.display = "block";
  document.getElementById("upgrade-qr").style.display = "none";
}

// Global modal handling
document.getElementById("upgrade-close")?.addEventListener("click", () => {
  document.getElementById("upgrade-modal-overlay").classList.add("hidden");
  setTimeout(resetUpgradeModal, 300); // reset after animation
});

async function checkAuthStatus() {
  const token = localStorage.getItem("token");
  if (token && authStatus) {
    authStatus.innerHTML = `<button class="btn btn-outline-white" style="border-radius: 8px; padding: 6px 12px; cursor: not-allowed;" disabled><i class="ph ph-spinner ph-spin"></i> Đang tải...</button>`;
    try {
      const res = await fetch(API_BASE_URL + "/api/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Invalid token");
      const data = await res.json();
      const email = data.email;
      const tier = data.tier.toUpperCase();
      const usage = `${data.targets_count}/${data.targets_limit}`;
      
      let badgeColor = "var(--text-muted)";
      let badgeText = `GÓI ${tier}`;
      
      if (tier === "MAX") {
        badgeColor = "#d97706";
      } else if (tier === "PREMIUM") {
        badgeColor = "var(--primary)";
      } else if (tier === "FREE") {
        badgeColor = "#ffffff";
        badgeText = "FREE";
      }
      
      authStatus.innerHTML = `
        <span style="font-size: 0.85rem; font-weight: bold; color: ${badgeColor}; border: 1px solid ${badgeColor}; padding: 2px 8px; border-radius: 12px; margin-right: 8px;" title="Đã dùng ${usage} Target">${badgeText}</span>
        <span style="font-size: 0.95rem; font-weight: 500; color: white;"><i class="ph ph-user"></i> ${email}</span>
        <button id="btn-upgrade" class="btn btn-primary" style="border-radius: 8px; padding: 4px 12px; margin-left: 8px; font-size: 0.85rem;"><i class="ph ph-crown"></i> Nâng cấp</button>
        <button id="btn-logout" class="btn btn-white" style="border-radius: 8px; padding: 4px 8px; margin-left: 8px;" title="Đăng xuất"><i class="ph ph-sign-out" style="font-size: 1.25rem;"></i></button>`;
        
      document.getElementById("btn-logout").addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user_email");
        checkAuthStatus();
        loadWatchlist();
      });
      document.getElementById("btn-upgrade").addEventListener("click", showUpgradeModal);
    } catch(err) {
      localStorage.removeItem("token");
      localStorage.removeItem("user_email");
      checkAuthStatus();
    }
  } else if (authStatus) {
    authStatus.innerHTML = `<button id="btn-show-login" class="btn btn-outline-white" style="border-radius: 8px; padding: 6px 12px;"><i class="ph ph-user"></i> Đăng nhập</button>`;
    document.getElementById("btn-show-login").addEventListener("click", showAuthModal);
  }
}

checkAuthStatus();
renderResults([]);
loadWatchlist();
