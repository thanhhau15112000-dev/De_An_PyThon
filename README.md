# Price Tracker

Day la de an Python 1 ban co ban. Ung dung dung de quet gia san pham,
luu lich su gia vao MongoDB, so sanh gia hien tai voi lich su va gui email
khi gia cham target.

Code duoc viet theo huong don gian, de doc, khong async, khong ORM, khong
framework frontend.

## Chuc nang

- Nhap mot hoac nhieu URL san pham.
- Quet gia bang `requests`.
- Boc tach HTML bang `selectolax`.
- Luu lich su vao MongoDB bang `pymongo`.
- Xem gia thap nhat, cao nhat, gia trung binh.
- Dua ra goi y: mua ngay, khong mua, hoac cho doi.
- Luu target price.
- Gui email canh bao bang `smtplib` neu da cau hinh SMTP.

## Cau truc file

```text
DE_AN_PYTHON/
|-- static/
|   |-- index.html
|   |-- styles.css
|   `-- app.js
|-- main.py
|-- scraper.py
|-- database.py
|-- mailer.py
|-- requirements.txt
|-- .env.example
`-- README.md
```

## Giai thich file

- `main.py`: file chay FastAPI va khai bao cac API.
- `scraper.py`: quet website va lay ten san pham, gia san pham.
- `database.py`: ket noi MongoDB, luu gia, doc lich su, tinh phan tich gia.
- `mailer.py`: gui email canh bao.
- `static/index.html`: giao dien web.
- `static/styles.css`: css cho giao dien.
- `static/app.js`: javascript goi API va hien thi du lieu.

## Cai dat lan dau

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

## Chay app

```powershell
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

Mo trinh duyet:

```text
http://127.0.0.1:8000/
```

## MongoDB

App mac dinh ket noi toi:

```text
mongodb://localhost:27017
```

Neu MongoDB Server chua chay thi app van quet duoc, nhung khong luu duoc
lich su gia va target.

Khi MongoDB chay dung, app se tao database:

```text
price_tracker_db
```

Va 2 collection:

```text
price_history
watchlist
```

## SMTP email

Neu muon gui email, sua file `.env`:

```text
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_google_app_password
SMTP_FROM_EMAIL=your_email@gmail.com
```

Neu khong cau hinh SMTP, app van chay binh thuong nhung khong gui email.
