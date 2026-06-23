# 📈 Tracker - Hệ Thống Theo Dõi & Phân Tích Giá Cả Ứng Dụng AI

**Tracker** là một ứng dụng web mạnh mẽ được thiết kế để giúp người dùng theo dõi biến động giá của các sản phẩm công nghệ (hiện đang tập trung vào Hoàng Hà Mobile). Không chỉ dừng lại ở việc lưu trữ lịch sử giá, ứng dụng còn tích hợp **Trí tuệ nhân tạo (Google Gemini)** đóng vai trò như một "Chuyên gia Tài chính", đưa ra các phân tích chuyên sâu và tư vấn điểm rơi thị trường tối ưu nhất để người dùng "chốt đơn".

---

## 🌐 Trải Nghiệm Trực Tuyến (Deployed App)
Dự án đã được triển khai hoàn chỉnh trên môi trường Cloud, bạn có thể truy cập và trải nghiệm ngay tại:
- **Frontend (Web App):** [https://pricetracker-zeta-one.vercel.app](https://pricetracker-zeta-one.vercel.app)
- **Backend (API):** [https://pricetracker-be.onrender.com](https://pricetracker-be.onrender.com)

---

## 🚀 Tính Năng Nổi Bật (Features)

### 1. 📊 Theo Dõi Lịch Sử Giá & Biểu Đồ Trực Quan
- Tự động cào (scrape) dữ liệu giá từ các trang thương mại điện tử theo thời gian thực bằng `selectolax`.
- Hiển thị biểu đồ biến động giá cực kỳ trực quan, mượt mà bằng thư viện `Chart.js`.
- Bảng xếp hạng, tóm tắt tổng quan về tổng số lượng sản phẩm quét thành công/thất bại.

### 2. 🧠 Phân Tích Cảnh Báo Thông Minh (Smart Signals)
Hệ thống tính toán trung bình giá, giá cao nhất, giá thấp nhất lịch sử để phân loại sản phẩm thành 3 nhóm đánh giá:
- 🟢 **Nên mua (Good):** Giá hiện tại đang ở mức đáy, chạm ngưỡng thấp nhất trong lịch sử theo dõi.
- 🟡 **Cân nhắc (Watch):** Giá ở mức trung bình, có thể chờ đợi thêm đợt giảm giá.
- 🔴 **Chưa nên mua (High):** Giá hiện đang bị "thổi" lên cao hơn mức trung bình, tuyệt đối không nên xuống tiền lúc này.

### 3. 🤖 Chuyên Gia Tài Chính AI (AI Chatbot)
- Được cấp nguồn sức mạnh từ **Google Gemini**, AI có khả năng đọc toàn bộ dữ liệu lịch sử giá của một sản phẩm bất kỳ.
- Người dùng có thể chat trực tiếp với AI để hỏi về: *Biên độ dao động, lý do tăng giảm, dự báo thời điểm nên mua, hoặc đánh giá chuyên môn về xu hướng giá.*
- Hỗ trợ lưu trữ lịch sử trò chuyện cục bộ (LocalStorage) giúp người dùng giữ được mạch phân tích mà không cần load lại context.

### 4. 🔔 Thông Báo Biến Động Giá (Price Alerts)
- Người dùng có thể thiết lập mức "Giá mục tiêu" (Target Price) cho từng sản phẩm.
- Khi hệ thống chạy nền (Background Tasks) phát hiện giá giảm chạm mức mục tiêu, một Email cảnh báo tự động sẽ được gửi đến hòm thư của người dùng ngay lập tức.

### 5. 🔐 Hệ Thống Người Dùng Chuyên Nghiệp
- Đăng nhập, Đăng ký bảo mật với JWT (JSON Web Token) và mã hóa mật khẩu `bcrypt`.
- Quản lý danh sách sản phẩm theo dõi (Watchlist) riêng tư cho từng tài khoản.
- Tích hợp Captcha tự động (Toán học đơn giản) chống Spam/Bot tạo tài khoản ảo.

---

## 🛠 Phân Tích Kiến Trúc Kỹ Thuật (Tech Stack)

### Frontend
- **Giao diện:** HTML5, CSS3 nguyên bản (Vanilla) theo phong cách Modern & Glassmorphism.
- **Logic:** Vanilla JavaScript.
- **Thư viện:** Phosphor Icons (Icon), Chart.js (Biểu đồ).
- **Hosting:** Vercel (Edge Network tải siêu tốc).

### Backend
- **Core:** Python 3.12 + FastAPI (Bất đồng bộ cực nhanh).
- **Database:** MongoDB + Motor (Async Driver).
- **AI Integration:** `google-genai` (Google Gemini API).
- **Bảo mật:** `passlib`, `PyJWT`.
- **Hosting:** Render.

---

## 🔮 Hướng Phát Triển Tương Lai (Roadmap)

1. **Mở Rộng Hệ Sinh Thái (Multi-Platform):**
   - Hỗ trợ cào dữ liệu (scraping) từ các ông lớn TMĐT khác: Shopee, Lazada, Tiki, CellphoneS, FPT Shop...
   - Tối ưu cơ chế xoay vòng Proxy (Rotating Proxies) để chống bị chặn (Anti-bot bypass).

2. **Tiện Ích Mở Rộng (Chrome Extension):**
   - Xây dựng Extension giúp người dùng khi đang lướt web mua sắm chỉ cần bấm 1 nút là sản phẩm tự động thêm vào danh sách theo dõi.

3. **Dự Báo Bằng Machine Learning (Price Forecasting):**
   - Không chỉ nhờ cậy LLM, mà sẽ tự thiết kế hoặc tích hợp mô hình `Time-Series Forecasting` (ví dụ: ARIMA, Prophet) để vẽ thêm đường dự báo xu hướng giá trong 30 ngày tới ngay trên biểu đồ.

4. **Kênh Thông Báo Đa Dạng (Omni-channel Alerts):**
   - Bên cạnh Email, tích hợp thêm Push Notifications trên điện thoại và cảnh báo qua Telegram Bot / Zalo ZNS.

5. **Phát Triển Mobile App:**
   - Đóng gói ứng dụng thành Native App (React Native / Flutter) để tiếp cận nhiều đối tượng người dùng cuối hơn.
