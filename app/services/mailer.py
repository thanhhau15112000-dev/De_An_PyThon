import smtplib
from email.message import EmailMessage
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_price_alert_sync(to_email: str, product_name: str, current_price: str, target_price: int, product_url: str):
    if not to_email:
        return False, "Chua nhap email nhan canh bao."

    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        return False, "Chua cau hinh SMTP trong file .env."

    message = EmailMessage()
    message["Subject"] = "Price Tracker - Gia da cham target"
    message["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
    message["To"] = to_email

    content = f"""
San pham da cham muc gia muc tieu.

San pham: {product_name}
Gia hien tai: {current_price}
Target: {target_price}

Link mua hang: {product_url}
Xem lich su va bieu do tai: {settings.APP_URL}
"""
    message.set_content(content)

    try:
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(message)
        server.quit()
        return True, ""
    except Exception as error:
        logger.error(f"Loi gui email: {error}")
        return False, str(error)
