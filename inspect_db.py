import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()
mongo_uri = os.getenv("MONGO_URI")

async def main():
    client = AsyncIOMotorClient(mongo_uri)
    db = client.get_database("pricetracker")
    
    # Get distinct URLs and their product names
    pipeline = [
        {"$sort": {"scraped_at": -1}},
        {"$group": {
            "_id": "$url",
            "product_name": {"$first": "$product_name"},
            "last_price": {"$first": "$price_value"}
        }}
    ]
    results = await db.price_history.aggregate(pipeline).to_list(None)
    
    for r in results:
        print(f"URL: {r['_id']}, Name: {r['product_name']}, Price: {r['last_price']}")
        
if __name__ == "__main__":
    asyncio.run(main())
