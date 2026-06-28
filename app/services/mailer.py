import smtplib
from email.message import EmailMessage
import logging
import socket
from app.core.config import settings

logger = logging.getLogger(__name__)

class IPv4SMTP(smtplib.SMTP):
    def _get_socket(self, host, port, timeout):
        info = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
        af, socktype, proto, canonname, sa = info[0]
        s = socket.socket(af, socktype, proto)
        if timeout is not socket._GLOBAL_DEFAULT_TIMEOUT:
            s.settimeout(timeout)
        s.connect(sa)
        return s

def send_price_alert_sync(to_email: str, product_name: str, current_price: str, target_price: int, product_url: str):
    if not to_email:
        return False, "Chua nhap email nhan canh bao."

    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        return False, "Chua cau hinh SMTP trong file .env."

    message = EmailMessage()
    message["Subject"] = "Price Tracker - Gia da cham target"
    message["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
    message["To"] = to_email

    html_content = f"""
    <h2>Price Tracker - Gia da cham target</h2>
    <p>San pham da cham muc gia muc tieu cua ban.</p>
    <ul>
        <li><strong>San pham:</strong> {product_name}</li>
        <li><strong>Gia hien tai:</strong> {current_price}</li>
        <li><strong>Target:</strong> {target_price}</li>
    </ul>
    <p><a href="{product_url}">Link mua hang</a></p>
    <p><a href="{settings.APP_URL}">Xem lich su va bieu do tai ung dung</a></p>
    """
    message.set_content(html_content, subtype='html')

    try:
        server = IPv4SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(message)
        server.quit()
        return True, ""
    except Exception as error:
        error_msg = str(error)
        logger.error(f"Loi gui email SMTP: {error_msg}")
        return False, error_msg
