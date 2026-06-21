from os import environ, getenv
from pathlib import Path

from fastapi import FastAPI
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"


def load_env():
    env_file = BASE_DIR / ".env"
    if not env_file.exists():
        return

    lines = env_file.read_text(encoding="utf-8").splitlines()
    for line in lines:
        if line.strip() == "" or line.strip().startswith("#"):
            continue
        if "=" in line:
            key, value = line.split("=", 1)
            environ.setdefault(key.strip(), value.strip())


load_env()

from database import (  # noqa: E402
    analyze_price,
    get_history,
    get_latest_prices,
    get_target_by_url,
    get_targets,
    now,
    ping_database,
    save_price,
    save_target,
    setup_database,
    update_target_after_scan,
)
from mailer import send_price_alert  # noqa: E402
from scraper import STORE_CONFIG, scrape_product, scrape_products  # noqa: E402

REQUEST_TIMEOUT = float(getenv("REQUEST_TIMEOUT_SECONDS", "10"))
USER_AGENT = getenv("USER_AGENT", "Mozilla/5.0 PriceTracker")

app = FastAPI(title="Price Tracker")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class ScanRequest(BaseModel):
    urls: list[str]


class TargetRequest(BaseModel):
    url: str
    target_price: int
    email: str = ""


@app.on_event("startup")
def startup():
    setup_database()


@app.get("/")
def home():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
def health():
    return {"status": "ok", "database": ping_database()}


@app.get("/api/supported-platforms")
def supported_platforms():
    stores = []
    for store_name, config in STORE_CONFIG.items():
        stores.append({"platform": store_name, "domains": config["domains"]})
    return {"platforms": stores}


def process_result(result):
    result["scraped_at"] = now()
    result["storage_status"] = "skipped"
    result["target_price"] = None
    result["alert_hit"] = False
    result["alert_status"] = "skipped"

    if result["success"] is False:
        result["buy_signal"] = "unknown"
        result["note"] = result["error"]
        result["analysis"] = {
            "sample_count": 0,
            "low_price": None,
            "high_price": None,
            "average_price": None,
            "buy_signal": "unknown",
            "note": result["error"],
        }
        return result

    analysis = analyze_price(result["url"], result["price_value"])
    result["analysis"] = analysis
    result["buy_signal"] = analysis["buy_signal"]
    result["note"] = analysis["note"]

    target = get_target_by_url(result["url"])
    if target:
        result["target_price"] = target.get("target_price")
        if result["price_value"] <= result["target_price"]:
            result["alert_hit"] = True
            sent, error = send_price_alert(
                target.get("email", ""),
                result["product_name"],
                result["price"],
                result["target_price"],
                result["url"],
            )
            result["alert_status"] = "sent" if sent else "failed"
            result["alert_error"] = error

    saved, error = save_price(
        {
            "url": result["url"],
            "platform": result["platform"],
            "product_name": result["product_name"],
            "price": result["price"],
            "price_value": result["price_value"],
            "currency": result["currency"],
            "availability": result["availability"],
            "buy_signal": result["buy_signal"],
            "note": result["note"],
            "scraped_at": result["scraped_at"],
        }
    )

    if saved:
        result["storage_status"] = "saved"
        update_target_after_scan(result)
    else:
        result["storage_status"] = "failed"
        result["note"] = result["note"] + " MongoDB chua luu duoc: " + error

    return result


@app.get("/api/check-price")
def check_price(url: str):
    result = scrape_product(url, REQUEST_TIMEOUT, USER_AGENT)
    result = process_result(result)
    return jsonable_encoder(result)


@app.post("/api/scan")
def scan(data: ScanRequest):
    raw_results = scrape_products(data.urls, REQUEST_TIMEOUT, USER_AGENT)
    results = []
    success_count = 0

    for item in raw_results:
        item = process_result(item)
        if item["success"]:
            success_count += 1
        results.append(jsonable_encoder(item))

    return {
        "summary": {
            "total": len(results),
            "success": success_count,
            "failed": len(results) - success_count,
            "mode": "sequential",
        },
        "results": results,
    }


@app.get("/api/history")
def history(url: str, limit: int = 30):
    data = get_history(url, limit)
    return jsonable_encoder({"url": url, "history": data, "count": len(data)})


@app.get("/api/overview")
def overview(limit: int = 20):
    data = get_latest_prices(limit)
    for item in data:
        item["success"] = True
        item["storage_status"] = "saved"
        item["analysis"] = analyze_price(item["url"], item.get("price_value"))
    return jsonable_encoder({"items": data, "count": len(data)})


@app.get("/api/watchlist")
def watchlist(limit: int = 30):
    data = get_targets(limit)
    return jsonable_encoder({"items": data, "count": len(data)})


@app.post("/api/watchlist")
def create_watch(data: TargetRequest, platform: str = "unknown", product_name: str = ""):
    saved, error = save_target(
        data.url,
        data.target_price,
        data.email,
        platform,
        product_name,
    )
    return {
        "saved": saved,
        "error": error,
        "url": data.url,
        "target_price": data.target_price,
        "email": data.email,
    }
