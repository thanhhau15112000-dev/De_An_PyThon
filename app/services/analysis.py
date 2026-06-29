from datetime import datetime, timezone, timedelta
from app.database.connection import db_ctx

def now():
    # Use Vietnam Time (UTC+7)
    return datetime.now(timezone(timedelta(hours=7)))

def remove_id(document):
    if document is None:
        return None
    document = dict(document)
    if "_id" in document:
        document["_id"] = str(document["_id"])
    return document

async def save_price(product: dict):
    try:
        latest = await db_ctx.db["price_history"].find_one(
            {"url": product["url"]},
            sort=[("scraped_at", -1)]
        )
        if latest and latest.get("price_value") == product["price_value"]:
            latest_time = latest.get("scraped_at")
            current_time = product.get("scraped_at")
            if latest_time and current_time and latest_time.date() == current_time.date():
                return True, "skipped_duplicate_today"

        await db_ctx.db["price_history"].insert_one(product)
        return True, ""
    except Exception as error:
        return False, str(error)

async def get_history(url: str, limit: int = 30):
    try:
        cursor = db_ctx.db["price_history"].find({"url": url}).sort("scraped_at", -1).limit(limit)
        data = await cursor.to_list(length=limit)
        data.reverse()
        return [remove_id(item) for item in data]
    except Exception:
        return []

async def get_latest_prices(limit: int = 20):
    try:
        pipeline = [
            {"$sort": {"scraped_at": -1}},
            {"$group": {"_id": "$url", "item": {"$first": "$$ROOT"}}},
            {"$replaceRoot": {"newRoot": "$item"}},
            {"$limit": limit},
        ]
        cursor = db_ctx.db["price_history"].aggregate(pipeline)
        data = await cursor.to_list(length=limit)
        return [remove_id(item) for item in data]
    except Exception:
        return []

async def analyze_price(url: str, current_price: int):
    if current_price is None:
        return {
            "sample_count": 0, "low_price": None, "high_price": None,
            "average_price": None, "buy_signal": "unknown", "note": "Gia hien tai khong hop le."
        }

    pipeline = [
        {"$match": {"url": url, "price_value": {"$type": "number"}}},
        {"$sort": {"scraped_at": -1}},
        {"$limit": 60},
        {"$group": {
            "_id": None,
            "low_price": {"$min": "$price_value"},
            "high_price": {"$max": "$price_value"},
            "average_price": {"$avg": "$price_value"},
            "sample_count": {"$sum": 1}
        }}
    ]
    
    try:
        cursor = db_ctx.db["price_history"].aggregate(pipeline)
        result = await cursor.to_list(length=1)
    except Exception:
        result = []
        
    if not result:
        return {
            "sample_count": 0, "low_price": None, "high_price": None,
            "average_price": None, "buy_signal": "unknown", "note": "Chua co lich su gia."
        }
        
    stats = result[0]
    low_price = stats["low_price"]
    high_price = stats["high_price"]
    average_price = round(stats["average_price"])

    if stats["sample_count"] <= 1:
        signal = "unknown"
        note = "Chưa đủ dữ liệu lịch sử để phân tích."
    elif current_price <= low_price:
        signal = "good"
        note = "Gia tot, co the mua."
    elif current_price > average_price:
        signal = "high"
        note = "Gia dang cao, khong nen mua."
    else:
        signal = "watch"
        note = "Gia tam on, co the cho them."

    return {
        "sample_count": stats["sample_count"],
        "low_price": low_price,
        "high_price": high_price,
        "average_price": average_price,
        "buy_signal": signal,
        "note": note,
    }

async def save_target(url: str, target_price: int, email: str = "", platform: str = "", product_name: str = ""):
    try:
        await db_ctx.db["watchlist"].update_one(
            {"url": url, "email": email},
            {
                "$set": {
                    "url": url,
                    "target_price": target_price,
                    "email": email,
                    "platform": platform,
                    "product_name": product_name,
                    "updated_at": now(),
                }
            },
            upsert=True,
        )
        return True, ""
    except Exception as error:
        return False, str(error)

async def get_targets(email: str, limit: int = 30):
    try:
        cursor = db_ctx.db["watchlist"].find({"email": email}).sort("updated_at", -1).limit(limit)
        data = await cursor.to_list(length=limit)
        return [remove_id(item) for item in data]
    except Exception:
        return []

async def get_targets_by_url(url: str):
    try:
        cursor = db_ctx.db["watchlist"].find({"url": url})
        data = await cursor.to_list(length=100)
        return [remove_id(item) for item in data]
    except Exception:
        return []

async def update_target_after_scan(result: dict):
    try:
        await db_ctx.db["watchlist"].update_many(
            {"url": result["url"]},
            {
                "$set": {
                    "platform": result.get("platform", ""),
                    "product_name": result.get("product_name", ""),
                    "last_price_value": result.get("price_value"),
                    "last_scraped_at": result.get("scraped_at"),
                    "updated_at": now(),
                }
            },
        )
    except Exception:
        pass
