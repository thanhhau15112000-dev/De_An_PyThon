import asyncio
import os
import random
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()
mongo_uri = os.getenv("MONGODB_URL")
db_name = os.getenv("MONGODB_DB_NAME", "price_tracker_db")

async def main():
    client = AsyncIOMotorClient(mongo_uri)
    db = client.get_database(db_name)
    
    await db.price_history.delete_many({})
    print("Deleted old price history.")
    
    now_utc = datetime.now(timezone.utc)
    new_records = []
    
    dummy_products = [
        {"url": "https://hoanghamobile.com/dien-thoai/dien-thoai-xiaomi-poco-m7", "name": "Điện thoại Xiaomi POCO M7 6GB/128GB"},
        {"url": "https://hoanghamobile.com/dien-thoai/iphone-15-pro-max-256gb", "name": "iPhone 15 Pro Max 256GB - Chính hãng VN/A"},
        {"url": "https://hoanghamobile.com/dien-thoai/samsung-galaxy-s24-ultra", "name": "Samsung Galaxy S24 Ultra 5G 256GB"},
        {"url": "https://hoanghamobile.com/dien-thoai/oppo-find-n3-flip", "name": "OPPO Find N3 Flip 5G"},
        {"url": "https://hoanghamobile.com/dien-thoai/vivo-v29-5g", "name": "Vivo V29 5G (12GB/256GB)"},
        {"url": "https://hoanghamobile.com/dien-thoai/realme-11-pro-plus", "name": "realme 11 Pro+ 5G"},
        {"url": "https://hoanghamobile.com/dien-thoai/asus-rog-phone-8", "name": "ASUS ROG Phone 8 16GB/256GB"},
        {"url": "https://hoanghamobile.com/dien-thoai/xiaomi-14-ultra", "name": "Xiaomi 14 Ultra 5G"},
        {"url": "https://hoanghamobile.com/dien-thoai/iphone-14-128gb", "name": "iPhone 14 128GB - Chính hãng VN/A"},
        {"url": "https://hoanghamobile.com/dien-thoai/samsung-galaxy-a55", "name": "Samsung Galaxy A55 5G"},
        {"url": "https://hoanghamobile.com/dien-thoai/poco-x6-pro", "name": "POCO X6 Pro 5G 8GB/256GB"}
    ]
    
    for i, product in enumerate(dummy_products):
        url = product["url"]
        product_name = product["name"]
        
        base_price = 5000000 + random.randint(0, 10) * 1000000
        
        # 0..3: Too high (current > avg)
        # 4..7: Too low (current < avg)
        # 8..11: Average (current ~ avg)
        
        if i % 3 == 0:
            prices = [base_price - 500000]*5 + [base_price + 1000000]*5
        elif i % 3 == 1:
            prices = [base_price + 1000000]*5 + [base_price - 500000]*5
        else:
            prices = [base_price]*3 + [base_price + 100000]*4 + [base_price]*3
            
        for day in range(10):
            record = {
                "url": url,
                "product_name": product_name,
                "price_value": prices[day],
                "scraped_at": now_utc - timedelta(days=9 - day)
            }
            new_records.append(record)
            
    if new_records:
        await db.price_history.insert_many(new_records)
        print(f"Inserted {len(new_records)} fake price records for 11 products.")
        
if __name__ == "__main__":
    asyncio.run(main())
