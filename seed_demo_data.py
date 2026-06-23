from datetime import datetime, timedelta
from random import Random
import pymongo

URLS = [
    "https://hoanghamobile.com/dien-thoai/dien-thoai-xiaomi-poco-m7-6gb-128gb",
    "https://hoanghamobile.com/dong-ho-thong-minh/vong-deo-tay-thong-minh-xiaomi-band-10-khung-ceramic",
    "https://cellphones.com.vn/laptop-msi-prestige-13-ai-ukiyoe-edition-a2vmg-075vn.html",
    "https://cellphones.com.vn/laptop-lenovo-legion-5-15irx10-83ly00hqvn.html",
    "https://hoanghamobile.com/dien-thoai/oppo-a3-8gb-256gb",
    "https://cellphones.com.vn/macbook-air-15-m5-10-cpu-10-gpu-24gb-1tb.html",
    "https://cellphones.com.vn/macbook-pro-14-inch-m5-24gb-1tb.html",
    "https://hoanghamobile.com/dien-thoai-di-dong/nubia-neo-8gb-256gb-chinh-hang",
    "https://cellphones.com.vn/macbook-neo-13-a18-pro-6-cpu-5-gpu-8gb-256gb.html",
    "https://cellphones.com.vn/macbook-neo-13-a18-pro-6-cpu-5-gpu-8gb-512gb.html",
    "https://cellphones.com.vn/apple-macbook-air-13-m4-10cpu-10gpu-24gb-512gb-2025-sac-70w.html",
]

HISTORY_COUNT = 30

FALLBACK_PRODUCTS = {
    "poco-m7": ("Xiaomi POCO M7 6GB 128GB", "hoanghamobile", 3990000),
    "xiaomi-band-10": ("Xiaomi Band 10 Ceramic", "hoanghamobile", 1590000),
    "msi-prestige": ("Laptop MSI Prestige 13 AI Ukiyoe Edition", "cellphones", 34990000),
    "lenovo-legion": ("Laptop Lenovo Legion 5 15IRX10", "cellphones", 42990000),
    "oppo-a3": ("OPPO A3 8GB 256GB", "hoanghamobile", 4990000),
    "macbook-air-15-m5": ("MacBook Air 15 M5 24GB 1TB", "cellphones", 45990000),
    "macbook-pro-14-inch-m5": ("MacBook Pro 14 M5 24GB 1TB", "cellphones", 59990000),
    "nubia-neo": ("Nubia Neo 8GB 256GB", "hoanghamobile", 4490000),
    "macbook-neo-13-a18-pro-6-cpu-5-gpu-8gb-256gb": ("MacBook Neo 13 inch A18 Pro 2026 8GB 256GB", "cellphones", 15990000),
    "macbook-neo-13-a18-pro-6-cpu-5-gpu-8gb-512gb": ("MacBook Neo 13 inch A18 Pro 2026 8GB 512GB", "cellphones", 18990000),
    "apple-macbook-air-13-m4-10cpu-10gpu-24gb-512gb-2025-sac-70w": ("MacBook Air M4 13 inch 2025 24GB 512GB", "cellphones", 34590000),
}


def unique_urls(urls):
    result = []
    for url in urls:
        if url not in result:
            result.append(url)
    return result


def fallback_for_url(url):
    for key, value in FALLBACK_PRODUCTS.items():
        if key in url:
            return value
    return "San pham demo", "unknown", 10000000


def round_price(value):
    return int(round(value / 10000) * 10000)


def format_price(value):
    return f"{value:,}".replace(",", ".") + "d"


def make_fake_history(url, product_name, platform, base_price):
    random = Random(url)
    today = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
    rows = []

    for days_ago in range(HISTORY_COUNT, 0, -1):
        date = today - timedelta(days=days_ago)
        old_price_bonus = days_ago / HISTORY_COUNT * 0.05
        random_change = random.uniform(-0.04, 0.04)
        sale_change = -0.08 if days_ago in [2, 10, 20] else 0
        price_value = round_price(base_price * (1 + old_price_bonus + random_change + sale_change))

        rows.append(
            {
                "url": url,
                "platform": platform,
                "product_name": product_name,
                "price": format_price(price_value),
                "price_value": price_value,
                "currency": "VND",
                "availability": "InStock",
                "buy_signal": "good" if sale_change < 0 else "watch",
                "note": "Du lieu demo lich su gia.",
                "scraped_at": date,
                "demo_seed": True,
            }
        )

    return rows


def get_product_info(url):
    # Only use fallback for demo seed to avoid breaking scraper
    product_name, platform, price = fallback_for_url(url)
    return product_name, platform, price


def main():
    client = pymongo.MongoClient("mongodb://localhost:27017")
    db = client["price_tracker_db"]
    price_history = db["price_history"]

    urls = unique_urls(URLS)
    all_rows = []

    for url in urls:
        product_name, platform, base_price = get_product_info(url)
        rows = make_fake_history(url, product_name, platform, base_price)
        all_rows.extend(rows)
        print(url)
        print("  product:", product_name.encode("ascii", "ignore").decode())
        print("  base price:", format_price(base_price))
        print("  rows:", len(rows))

    price_history.delete_many({"url": {"$in": urls}, "demo_seed": True})
    price_history.insert_many(all_rows)

    print("Inserted demo rows:", len(all_rows))


if __name__ == "__main__":
    main()
