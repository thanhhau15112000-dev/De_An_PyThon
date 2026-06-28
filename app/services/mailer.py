import logging
import resend
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_price_alert_sync(to_email: str, product_name: str, current_price: str, target_price: int, product_url: str):
    if not to_email:
        return False, "Chua nhap email nhan canh bao."

    if not settings.RESEND_API_KEY:
        return False, "Chua cau hinh RESEND_API_KEY trong file .env."

    resend.api_key = settings.RESEND_API_KEY

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

    try:
        r = resend.Emails.send({
            "from": "onboarding@resend.dev",
            "to": to_email,
            "subject": "Price Tracker - Gia da cham target",
            "html": html_content
        })
        return True, ""
    except Exception as error:
        error_msg = str(error)
        logger.error(f"Loi gui email Resend: {error_msg}")
        return False, error_msg
