# Price Tracker & AI Financial Assistant (Đồ án Kiến trúc Phần mềm)

## 1. Tổng Quan Dự Án
**Price Tracker** là một hệ thống theo dõi và phân tích biến động giá cả trên các nền tảng thương mại điện tử, được phát triển với mục tiêu hỗ trợ người dùng đưa ra quyết định mua sắm tối ưu. Thay vì chỉ cung cấp biểu đồ lịch sử giá đơn thuần, hệ thống được tích hợp **Module Phân Tích Thông Minh** (dựa trên thống kê lịch sử) và **Mô hình Ngôn ngữ Lớn (LLMs)**, đóng vai trò như một chuyên gia tư vấn tài chính ảo.

Dự án này là sự kết hợp giữa các kỹ thuật tiên tiến trong Kiến trúc phần mềm: **Thu thập dữ liệu (Web Scraping)**, **Xử lý tác vụ nền tự động (Background Cron Jobs)**, **Tích hợp Webhook (Thanh toán tự động)** và **Trí tuệ nhân tạo (AI Integration)**.

---

## 2. Trải Nghiệm Hệ Thống (Live Deployment)
Hệ thống hiện đã được đóng gói và triển khai trên hạ tầng Cloud, cho phép truy cập và sử dụng trực tiếp qua Internet:
- **Giao diện Người Dùng (Frontend):** [https://pricetracker-zeta-one.vercel.app](https://pricetracker-zeta-one.vercel.app)
- **Hệ thống Máy Chủ (Backend API):** [https://pricetracker-be.onrender.com](https://pricetracker-be.onrender.com)

---

## 3. Kiến Trúc Kỹ Thuật (Technology Stack)

Hệ thống được thiết kế theo kiến trúc **Client - Server** (Microservices-oriented) với sự tách biệt rõ ràng giữa các phân hệ:

- **Frontend (Presentation Layer):**
  - **Ngôn ngữ:** HTML5, CSS3, Vanilla JavaScript (Không sử dụng Framework nặng nề để tối ưu tốc độ tải trang).
  - **UI/UX:** Áp dụng nguyên lý Modern Web Design, Glassmorphism, Animations, Responsive Design.
  - **Thư viện hỗ trợ:** `Chart.js` (Trực quan hóa dữ liệu biểu đồ), `Phosphor Icons` (Hệ thống biểu tượng chuẩn).
  - **Triển khai:** Vercel (Hỗ trợ CDN toàn cầu).

- **Backend (Business & Data Layer):**
  - **Framework:** Python 3.12, FastAPI (Framework xử lý bất đồng bộ - Asynchronous hiệu suất cực cao).
  - **Cơ sở dữ liệu:** MongoDB (NoSQL - Lưu trữ Document linh hoạt, phù hợp với data Scraping đa dạng), Motor (Async MongoDB Driver).
  - **Web Scraping:** `selectolax` (Phân tích cú pháp HTML siêu tốc bằng C), `httpx` (HTTP Client bất đồng bộ).
  - **Authentication:** JSON Web Token (JWT), `passlib`, thuật toán băm mật khẩu `bcrypt`.
  - **AI Integration:** `google-genai` (Google Gemini API).
  - **Email Service:** `smtplib` và SMTP Server của SendGrid.
  - **Triển khai:** Render (PaaS).

---

## 4. Các Tính Năng Cốt Lõi (Core Features)

### 4.1. Hệ Thống Thu Thập và Trực Quan Hóa Dữ Liệu
- **Web Scraping:** Tự động bóc tách và trích xuất dữ liệu giá cả từ các liên kết thương mại điện tử (Shopee, CellphoneS, FPT, v.v.).
- **Trực quan hóa (Data Visualization):** Vẽ biểu đồ lịch sử giá (Line Chart) theo thời gian thực (real-time) ngay trên giao diện, giúp người dùng dễ dàng nhận diện xu hướng tăng/giảm của thị trường, xác định điểm kháng cự / hỗ trợ của giá.

### 4.2. Cơ Chế Phân Tích Tín Hiệu Khuyến Nghị (Smart Signals)
Hệ thống tự động tính toán các chỉ số thống kê (Giá thấp nhất, cao nhất, trung bình) trên tập dữ liệu lịch sử của từng sản phẩm để đưa ra 3 loại **tín hiệu giao dịch**:
- **Nên mua (Good - Tín hiệu Xanh):** Khi mức giá hiện tại đang ở ngưỡng thấp nhất hoặc bằng với đáy của lịch sử theo dõi. (Cơ hội bắt đáy).
- **Cân nhắc (Watch - Tín hiệu Vàng):** Khi mức giá hiện tại nằm trong khoảng an toàn (cao hơn mức đáy nhưng thấp hơn hoặc bằng mức trung bình).
- **Chưa nên mua (High - Tín hiệu Đỏ):** Khi mức giá hiện tại vượt mức trung bình lịch sử, cho thấy sản phẩm đang bị định giá cao (đu đỉnh) tại thời điểm đánh giá.

### 4.3. Chuyên Gia Tài Chính Trí Tuệ Nhân Tạo (AI Financial Advisor)
- Tích hợp **Google Gemini 1.5 Flash API** để phân tích mảng dữ liệu lịch sử giá dưới dạng chuỗi thời gian (Time-series).
- Cung cấp giao diện đàm thoại (Chat Interface) ngay bên dưới sản phẩm. Người dùng có thể đặt câu hỏi hoặc yêu cầu AI nhận định. AI sẽ phản hồi bằng văn bản tự nhiên, đánh giá chuyên sâu về biên độ dao động, rủi ro biến động, điểm rơi giá lịch sử và đưa ra lời khuyên mua sắm mang tính cá nhân hóa.

### 4.4. Hệ Thống Cảnh Báo Tự Động & Background Workers (Cron Jobs)
- Người dùng thiết lập **"Giá mục tiêu" (Target Price)** cho mỗi sản phẩm.
- **Background Worker (`apscheduler`):** Các tác vụ chạy ngầm được lập lịch để đánh thức hệ thống và quét lại giá của toàn bộ sản phẩm trong Database.
- **Thuật toán tối ưu:** Worker tự động nhận diện Gói cước (Tier) của User để quyết định chu kỳ quét (Gói Free: 24h/lần, Premium: 3h/lần, Max: 1h/lần). 
- Khi giá thị trường thực tế giảm xuống mức mong muốn, hệ thống sẽ trigger **Email Alert** tự động thông báo cho người dùng thông qua SendGrid SMTP.

### 4.5. Tích Hợp Cổng Thanh Toán Tự Động (Dynamic VietQR & Webhook)
- Ứng dụng tích hợp luồng Thanh toán nâng cấp Gói cước (SaaS Model) cực kỳ hiện đại.
- **Dynamic VietQR:** Khi người dùng chọn Gói, hệ thống gọi API tạo mã VietQR động trực tiếp trên giao diện với đầy đủ thông tin: Ngân hàng, Số TK, Số tiền chính xác và Cú pháp chuyển khoản chứa Email (`UPGRADE {email}`).
- **Webhook Listener:** Xây dựng Endpoint `/api/sepay/webhook` cắm trực tiếp vào hệ thống Core Banking thông qua SePay. Khi người dùng quét mã chuyển tiền, Server nhận Webhook, tự động verify giao dịch và nâng cấp Database người dùng sang gói VIP (PREMIUM/MAX) trong chưa tới 2 giây (Hoàn toàn không cần sự can thiệp của con người).

### 4.6. Phân Hệ Quản Trị Người Dùng & Phân Quyền (RBAC / Tiered System)
- Đăng ký, Đăng nhập, và Quản lý phiên bằng chuẩn **JWT**.
- Giới hạn tài nguyên (Rate-limiting / Quota) thông minh:
  - **Gói FREE:** Tối đa theo dõi 1 sản phẩm, tần suất quét 24h.
  - **Gói PREMIUM:** Tối đa 10 sản phẩm, quét 3h.
  - **Gói MAX:** Tối đa 100 sản phẩm, quét 1h.

---

## 5. Định Hướng Phát Triển Tương Lai (Future Scope)

1. **Ứng dụng Mô hình Học máy (Machine Learning Forecast):**
   - Tích hợp các mô hình dự báo chuỗi thời gian (Time-Series Forecasting) như ARIMA, LSTM hoặc Prophet để vẽ "đường dự báo xu hướng giá trong tương lai" trên biểu đồ, đưa ra xác suất giảm giá trong 7 ngày tới.
2. **Kiến Trúc Microservices & Message Queue:**
   - Sử dụng Redis, RabbitMQ hoặc Kafka để phân tán tác vụ Scraping ra nhiều Worker Nodes nhằm chịu tải khi hệ thống đạt mốc hàng triệu sản phẩm.
   - Tích hợp các giải pháp Rotating Proxies chống Anti-bot.
3. **Phát triển Browser Extension (Chrome/Edge):**
   - Cho phép người dùng theo dõi giá ngay tại trang mua sắm của Shopee/Lazada chỉ bằng một click chuột (Không cần copy paste URL).
