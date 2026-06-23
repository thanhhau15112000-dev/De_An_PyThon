# Price Tracker & AI Financial Assistant

## 1. Tổng Quan Dự Án
**Price Tracker** là một hệ thống theo dõi và phân tích biến động giá cả trên các nền tảng thương mại điện tử, được phát triển với mục tiêu hỗ trợ người dùng đưa ra quyết định mua sắm tối ưu. Thay vì chỉ cung cấp biểu đồ lịch sử giá đơn thuần, hệ thống được tích hợp Module Phân Tích Thông Minh dựa trên thống kê lịch sử và Mô hình Ngôn ngữ Lớn (LLMs), đóng vai trò như một chuyên gia tư vấn tài chính ảo.

Dự án này là sự kết hợp giữa các kỹ thuật Thu thập dữ liệu (Web Scraping), Xử lý tác vụ nền (Background Tasks), và Trí tuệ nhân tạo (AI Integration).

---

## 2. Trải Nghiệm Hệ Thống (Live Deployment)
Hệ thống hiện đã được đóng gói và triển khai trên hạ tầng Cloud, cho phép truy cập và sử dụng trực tiếp:
- **Giao diện Người Dùng (Frontend):** [https://pricetracker-zeta-one.vercel.app](https://pricetracker-zeta-one.vercel.app)
- **Hệ thống Máy Chủ (Backend API):** [https://pricetracker-be.onrender.com](https://pricetracker-be.onrender.com)

---

## 3. Kiến Trúc Kỹ Thuật (Technology Stack)

Hệ thống được thiết kế theo kiến trúc Client - Server với sự tách biệt rõ ràng giữa các phân hệ:

- **Frontend:**
  - Ngôn ngữ: HTML5, CSS3, Vanilla JavaScript.
  - UI/UX: Áp dụng nguyên lý Modern Web Design, Glassmorphism, Responsive Design.
  - Thư viện hỗ trợ: `Chart.js` (Trực quan hóa dữ liệu), `Phosphor Icons` (Hệ thống biểu tượng).
  - Triển khai: Vercel.

- **Backend:**
  - Framework: Python 3.12, FastAPI (Xử lý bất đồng bộ hiệu suất cao).
  - Cơ sở dữ liệu: MongoDB (Lưu trữ Document linh hoạt), Motor (Async MongoDB Driver).
  - Web Scraping: `selectolax`, `httpx`.
  - Authentication: JSON Web Token (JWT), `passlib`, `bcrypt`.
  - AI Integration: `google-genai` (Google Gemini API).
  - Triển khai: Render.

---

## 4. Các Tính Năng Cốt Lõi

### 4.1. Hệ Thống Thu Thập và Trực Quan Hóa Dữ Liệu
- Tự động bóc tách và trích xuất dữ liệu giá cả từ các liên kết thương mại điện tử được cung cấp.
- Trực quan hóa dữ liệu lịch sử giá dưới dạng biểu đồ đường (Line Chart) theo thời gian thực, giúp người dùng dễ dàng nhận diện xu hướng tăng/giảm của thị trường.

### 4.2. Cơ Chế Phân Tích Tín Hiệu Khuyến Nghị (Smart Signals)
Hệ thống tự động tính toán các chỉ số thống kê (Giá thấp nhất, cao nhất, trung bình) trên tập dữ liệu lịch sử của từng sản phẩm để đưa ra 3 loại tín hiệu giao dịch:
- **Nên mua (Good - Tín hiệu Xanh):** Khi mức giá hiện tại đang ở ngưỡng thấp nhất hoặc bằng với đáy của lịch sử theo dõi.
- **Cân nhắc (Watch - Tín hiệu Vàng):** Khi mức giá hiện tại nằm trong khoảng an toàn (cao hơn mức đáy nhưng thấp hơn hoặc bằng mức trung bình).
- **Chưa nên mua (High - Tín hiệu Đỏ):** Khi mức giá hiện tại vượt mức trung bình lịch sử, cho thấy sản phẩm đang bị định giá cao tại thời điểm đánh giá.

### 4.3. Chuyên Gia Tài Chính Trí Tuệ Nhân Tạo (AI Chatbot)
- Tích hợp Google Gemini để phân tích mảng dữ liệu lịch sử giá dưới dạng chuỗi thời gian.
- Cung cấp giao diện đàm thoại (Chat Interface) cho phép người dùng đặt câu hỏi trực tiếp về sản phẩm. AI sẽ phản hồi bằng văn bản tự nhiên, đánh giá chuyên sâu về biên độ dao động, rủi ro biến động, và đưa ra lời khuyên mua sắm mang tính cá nhân hóa.

### 4.4. Hệ Thống Cảnh Báo Tự Động (Automated Price Alerts)
- Cho phép người dùng thiết lập mức "Giá mục tiêu" (Target Price) cho từng sản phẩm.
- Các tác vụ nền (Background Workers) liên tục chạy theo chu kỳ để cập nhật giá mới. Khi phát hiện giá thị trường giảm xuống dưới hoặc bằng mức Giá mục tiêu, hệ thống tự động gửi Email cảnh báo (`smtplib`) đến người dùng.

### 4.5. Phân Hệ Quản Trị Người Dùng
- Cung cấp đầy đủ các chức năng Đăng ký, Đăng nhập, và Quản lý phiên làm việc.
- Dữ liệu mật khẩu được băm (hash) bằng thuật toán mã hóa một chiều `bcrypt`.
- Mỗi tài khoản sở hữu một danh mục theo dõi (Watchlist) độc lập và bảo mật.

---

## 5. Định Hướng Phát Triển Tương Lai

1. **Ứng dụng Mô hình Học máy (Machine Learning Forecast):**
   - Nghiên cứu và tích hợp các mô hình dự báo chuỗi thời gian (Time-Series Forecasting) như ARIMA, LSTM hoặc Prophet để vẽ đường dự báo xu hướng giá trong tương lai trên biểu đồ, thay vì chỉ phân tích dữ liệu quá khứ.
2. **Mở rộng Hệ sinh thái Scraping:**
   - Xây dựng kiến trúc Microservices để hỗ trợ trích xuất dữ liệu từ đa dạng các sàn thương mại điện tử lớn (Shopee, Lazada, Tiki, Amazon).
   - Tích hợp các giải pháp Rotating Proxies và User-Agent ngẫu nhiên nhằm giảm thiểu tỷ lệ bị chặn bởi cơ chế Anti-bot.
3. **Phát triển Ứng dụng Di động & Tiện ích Mở rộng:**
   - Xây dựng Browser Extension (Chrome/Edge) cho phép người dùng thêm sản phẩm vào danh sách theo dõi chỉ bằng một thao tác nhấp chuột khi đang duyệt web.
   - Phát triển ứng dụng di động (Cross-platform bằng Flutter/React Native) và tích hợp Push Notifications thay vì chỉ sử dụng Email.
