import smtplib
from email.message import EmailMessage
from os import getenv


SMTP_HOST = getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(getenv("SMTP_PORT", "587"))
SMTP_USERNAME = getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = getenv("SMTP_FROM_EMAIL", SMTP_USERNAME)


def send_price_alert(to_email, product_name, current_price, target_price, product_url):
    if to_email == "":
        return False, "Chua nhap email nhan canh bao."

    if SMTP_USERNAME == "" or SMTP_PASSWORD == "":
        return False, "Chua cau hinh SMTP trong file .env."

    message = EmailMessage()
    message["Subject"] = "Price Tracker - Gia da cham target"
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = to_email

    content = f"""
San pham da cham muc gia muc tieu.

San pham: {product_name}
Gia hien tai: {current_price}
Target: {target_price}
Link: {product_url}
"""
    message.set_content(content)

    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(message)
        server.quit()
        return True, ""
    except Exception as error:
        return False, str(error)
