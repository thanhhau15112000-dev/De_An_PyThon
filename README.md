# Price Tracker

Đây là một đề án Python cơ bản. Ứng dụng cung cấp chức năng cào (scraping) giá sản phẩm từ các trang thương mại điện tử, lưu trữ dữ liệu lịch sử vào MongoDB, phân tích biến động giá và gửi email cảnh báo khi mức giá chạm ngưỡng mục tiêu (target price).

Mã nguồn được thiết kế theo hướng tối giản: không sử dụng kiến trúc bất đồng bộ (async), không dùng ORM phức tạp và không tích hợp framework frontend.

## Các tính năng chính

- Thu thập dữ liệu từ một hoặc nhiều URL sản phẩm.
- Thực hiện cào dữ liệu HTTP thông qua `requests`.
- Phân tích và bóc tách cấu trúc DOM (HTML) bằng `selectolax`.
- Lưu trữ time-series dữ liệu giá vào MongoDB thông qua `pymongo`.
- Phân tích thống kê: cung cấp giá thấp nhất, cao nhất và trung bình.
- Động cơ khuyến nghị cơ bản: tính toán tín hiệu (mua ngay, không mua, chờ đợi).
- Thiết lập mức giá mục tiêu và quản lý danh sách theo dõi (watchlist).
- Gửi email cảnh báo qua giao thức SMTP (`smtplib`).

## Cấu trúc thư mục

```text
DE_AN_PYTHON/
├── static/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── main.py
├── scraper.py
├── database.py
├── mailer.py
├── requirements.txt
├── .env.example
└── README.md
```

## Chức năng các file

- `main.py`: Điểm neo của ứng dụng, khởi tạo FastAPI server và định nghĩa các HTTP API endpoint.
- `scraper.py`: Chịu trách nhiệm gọi HTTP request, phân tích DOM để trích xuất tên sản phẩm và giá trị từ các website.
- `database.py`: Quản lý kết nối MongoDB, thực thi các truy vấn đọc/ghi lịch sử và logic phân tích giá trị.
- `mailer.py`: Xử lý giao thức SMTP để đẩy email cảnh báo.
- `static/index.html`: Giao diện người dùng tĩnh (HTML).
- `static/styles.css`: Bản định kiểu hiển thị.
- `static/app.js`: Xử lý tương tác phía client, gọi API và kết xuất dữ liệu lên DOM.

## Quy trình cài đặt

```powershell
# Tạo môi trường ảo
python -m venv venv

# Kích hoạt môi trường (PowerShell)
.\venv\Scripts\Activate.ps1

# Cài đặt thư viện phụ thuộc
pip install -r requirements.txt

# Khởi tạo biến môi trường
Copy-Item .env.example .env
```

## Khởi động Ứng dụng

```powershell
# Bắt buộc kích hoạt môi trường ảo trước khi chạy
.\venv\Scripts\Activate.ps1

# Chạy server FastAPI
uvicorn main:app --reload
```

Truy cập giao diện Web tại trình duyệt: `http://127.0.0.1:8000/`

## Cấu hình MongoDB

Ứng dụng mặc định kết nối tới: `mongodb://localhost:27017`

Nếu MongoDB Server chưa được khởi động, hệ thống vẫn duy trì tính năng bóc tách giá tức thời. Tuy nhiên, mọi luồng ghi lịch sử và quản lý watchlist sẽ bị rớt (drop).

Khi MongoDB khả dụng, ứng dụng tự động cấp phát:
- Database: `price_tracker_db`
- Collections: `price_history`, `watchlist`

## Cấu hình SMTP Email (Tùy chọn)

Để kích hoạt luồng cảnh báo qua email, bổ sung hoặc sửa đổi file `.env`:

```env
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_google_app_password
SMTP_FROM_EMAIL=your_email@gmail.com
```

Nếu cấu hình SMTP trống, ứng dụng sẽ tự động vô hiệu hóa module gửi thư, quy trình theo dõi giá vẫn vận hành bình thường.
