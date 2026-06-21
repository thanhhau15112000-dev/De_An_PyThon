from datetime import datetime
from os import getenv

from pymongo import MongoClient


MONGO_URL = getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = getenv("MONGODB_DB_NAME", "price_tracker_db")

client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=3000)
db = client[DB_NAME]

price_history = db["price_history"]
watchlist = db["watchlist"]


def now():
    return datetime.now()


def ping_database():
    try:
        client.admin.command("ping")
        return True
    except Exception:
        return False


def setup_database():
    try:
        price_history.create_index("url")
        watchlist.create_index("url", unique=True)
    except Exception:
        pass


def remove_id(document):
    if document is None:
        return None
    document = dict(document)
    if "_id" in document:
        document["_id"] = str(document["_id"])
    return document


def save_price(product):
    try:
        price_history.insert_one(product)
        return True, ""
    except Exception as error:
        return False, str(error)


def get_history(url, limit=30):
    try:
        data = price_history.find({"url": url}).sort("scraped_at", -1).limit(limit)
        data = list(data)
        data.reverse()
        return [remove_id(item) for item in data]
    except Exception:
        return []


def get_latest_prices(limit=20):
    try:
        pipeline = [
            {"$sort": {"scraped_at": -1}},
            {"$group": {"_id": "$url", "item": {"$first": "$$ROOT"}}},
            {"$replaceRoot": {"newRoot": "$item"}},
            {"$limit": limit},
        ]
        data = list(price_history.aggregate(pipeline))
        return [remove_id(item) for item in data]
    except Exception:
        return []


def analyze_price(url, current_price):
    history = get_history(url, 60)
    prices = []

    for item in history:
        value = item.get("price_value")
        if isinstance(value, int):
            prices.append(value)

    if len(prices) == 0 or current_price is None:
        return {
            "sample_count": len(prices),
            "low_price": None,
            "high_price": None,
            "average_price": None,
            "buy_signal": "unknown",
            "note": "Chua co lich su gia.",
        }

    low_price = min(prices)
    high_price = max(prices)
    average_price = round(sum(prices) / len(prices))

    if current_price <= low_price:
        signal = "good"
        note = "Gia tot, co the mua."
    elif current_price > average_price:
        signal = "high"
        note = "Gia dang cao, khong nen mua."
    else:
        signal = "watch"
        note = "Gia tam on, co the cho them."

    return {
        "sample_count": len(prices),
        "low_price": low_price,
        "high_price": high_price,
        "average_price": average_price,
        "buy_signal": signal,
        "note": note,
    }


def save_target(url, target_price, email="", platform="", product_name=""):
    try:
        watchlist.update_one(
            {"url": url},
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


def get_targets(limit=30):
    try:
        data = watchlist.find({}).sort("updated_at", -1).limit(limit)
        return [remove_id(item) for item in data]
    except Exception:
        return []


def get_target_by_url(url):
    try:
        return remove_id(watchlist.find_one({"url": url}))
    except Exception:
        return None


def update_target_after_scan(result):
    try:
        watchlist.update_one(
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
