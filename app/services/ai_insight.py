import os
import google.generativeai as genai

# Cấu hình API key từ biến môi trường
API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

async def generate_insight(product_name: str, history_data: list) -> str:
    if not API_KEY:
        return "⚠️ Chưa cấu hình GEMINI_API_KEY trong hệ thống."
        
    if not history_data:
        return "Chưa có đủ dữ liệu lịch sử để phân tích."

    # Lấy 10 mốc giá gần nhất để prompt không quá dài
    recent_history = history_data[:10]
    prices = [item.get("price_value") for item in recent_history if item.get("price_value")]
    
    if not prices:
        return "Không có dữ liệu giá hợp lệ."

    current_price = prices[0]
    min_price = min(prices)
    max_price = max(prices)

    prompt = f"""
Bạn là một chuyên gia phân tích tài chính nghiêm túc, khách quan nhưng luôn hỗ trợ tốt cho người dùng. 
Nhiệm vụ của bạn là đưa ra lời khuyên MUA SẮM dựa trên biến động giá của sản phẩm.

LƯU Ý QUAN TRỌNG:
1. TUYỆT ĐỐI CHỈ nói về giá cả của sản phẩm được cung cấp. Nếu người dùng hỏi các vấn đề không liên quan đến sản phẩm này, hãy từ chối trả lời lịch sự.
2. Trình bày cực kỳ TRỰC QUAN, NGẮN GỌN (dưới 4 câu).
3. NHẤN MẠNH (in đậm) lời khuyên chính (VD: **NÊN MUA NGAY**, **NÊN CHỜ THÊM**).

THÔNG TIN SẢN PHẨM:
- Tên: {product_name}
- Giá hiện tại: {current_price} VNĐ
- Giá thấp nhất gần đây: {min_price} VNĐ
- Giá cao nhất gần đây: {max_price} VNĐ

Hãy phân tích ngắn gọn và đưa ra lời khuyên.
"""

    try:
        model = genai.GenerativeModel("gemini-3.5-flash")
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Lỗi khi kết nối AI: {str(e)}"

async def chat_with_ai(product_name: str, history_data: list, message: str, chat_history: list):
    if not API_KEY:
        return "Lỗi: Chưa cấu hình GEMINI_API_KEY trong file .env"

    try:
        model = genai.GenerativeModel("gemini-3.5-flash")
        
        if history_data:
            latest = history_data[-1]
            current_price = latest.get("price_value", 0)
            prices = [item.get("price_value", 0) for item in history_data if isinstance(item.get("price_value"), (int, float))]
            if prices:
                min_price = min(prices)
                max_price = max(prices)
                avg_price = sum(prices) / len(prices)
            else:
                min_price = max_price = avg_price = current_price
                
            context = f"""
Thông tin về sản phẩm "{product_name}":
- Giá hiện tại: {current_price:,} VNĐ
- Mức giá thấp nhất: {min_price:,} VNĐ
- Mức giá cao nhất: {max_price:,} VNĐ
- Giá trung bình: {avg_price:,.0f} VNĐ
"""
        else:
            context = f"Sản phẩm '{product_name}' chưa có lịch sử giá."

        formatted_history = []
        for msg in chat_history:
            formatted_history.append({"role": msg["role"], "parts": [msg["parts"]]})

        chat = model.start_chat(history=formatted_history)
        
        if not chat_history:
            full_message = f"Bạn là một chuyên gia tài chính. {context}\n\nYêu cầu của người dùng: {message}"
        else:
            full_message = message

        response = chat.send_message(full_message)
        return response.text.strip()
    except Exception as e:
        return f"Lỗi khi kết nối AI: {str(e)}"
