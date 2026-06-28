import hmac
import hashlib
import time

# Từ tài khoản của người dùng cung cấp trong ảnh
SEPAY_MERCHANT_ID = "SP-TEST-A694463"
SEPAY_SECRET_KEY = "spsk_test_N2XbW9on6JkQHUirSpxpz3cPT6GY2wMd"
SEPAY_CHECKOUT_URL = "https://pay-sandbox.sepay.vn/v1/checkout/init"

def generate_sepay_checkout_payload(email: str, tier: str, amount: int) -> dict:
    invoice_number = f"UPGRADE-{int(time.time())}"
    
    # Cú pháp cực kỳ quan trọng để Webhook cũ bắt được
    description = f"UPGRADE {email}"
    
    fields = {
        'merchant': SEPAY_MERCHANT_ID,
        'payment_method': 'BANK_TRANSFER',
        'order_amount': str(amount),
        'currency': 'VND',
        'order_invoice_number': invoice_number,
        'order_description': description,
        'operation': 'PURCHASE',
    }
    
    # Thuật toán ký của SePay Checkout API
    # 1. Lọc các field nằm trong danh sách cần ký (theo thứ tự mảng chuẩn của SePay)
    # Tuy nhiên thực tế SDK JS chỉ filter những field có trong danh sách rồi nối lại.
    # Ta sẽ nối các tham số theo đúng thứ tự mà JS đã làm.
    sign_keys = [
        'merchant', 'env', 'operation', 'payment_method', 
        'order_amount', 'currency', 'order_invoice_number', 
        'order_description', 'customer_id', 'agreement_id', 
        'agreement_name', 'agreement_type', 'agreement_payment_frequency', 
        'agreement_amount_per_payment', 'success_url', 'error_url', 
        'cancel_url', 'order_id'
    ]
    
    signed_parts = []
    for key in sign_keys:
        if key in fields and fields[key] is not None:
            signed_parts.append(f"{key}={fields[key]}")
            
    sign_string = ",".join(signed_parts)
    
    signature = hmac.new(
        SEPAY_SECRET_KEY.encode('utf-8'),
        sign_string.encode('utf-8'),
        hashlib.sha256
    ).digest()
    
    import base64
    b64_signature = base64.b64encode(signature).decode('utf-8')
    
    fields['signature'] = b64_signature
    
    return {
        "checkout_url": SEPAY_CHECKOUT_URL,
        "fields": fields
    }
