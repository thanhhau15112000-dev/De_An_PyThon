from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi.encoders import jsonable_encoder
from starlette.concurrency import run_in_threadpool

from app.models.schemas import ScanRequest, TargetRequest, ChatRequest
from app.services.scraper import STORE_CONFIG, scrape_product, scrape_products
from app.services.analysis import analyze_price, save_price, get_history, get_latest_prices, get_targets, save_target, get_targets_by_url, update_target_after_scan, now
from app.services.ai_insight import generate_insight, chat_with_ai
from app.services.mailer import send_price_alert_sync
from app.core.security import get_current_user

router = APIRouter()

@router.get("/health")
async def health():
    from app.database.connection import ping_database
    status = await ping_database()
    return {"status": "ok", "database": status}

@router.get("/supported-platforms")
async def supported_platforms():
    stores = []
    for store_name, config in STORE_CONFIG.items():
        stores.append({"platform": store_name, "domains": config["domains"]})
    return {"platforms": stores}

async def process_result(result: dict):
    result["scraped_at"] = now()
    result["storage_status"] = "skipped"
    result["target_price"] = None
    result["alert_hit"] = False
    result["alert_status"] = "skipped"

    if result["success"] is False:
        result["buy_signal"] = "unknown"
        result["note"] = result["error"]
        result["analysis"] = {
            "sample_count": 0, "low_price": None, "high_price": None,
            "average_price": None, "buy_signal": "unknown", "note": result["error"],
        }
        return result

    analysis = await analyze_price(result["url"], result["price_value"])
    result["analysis"] = analysis
    result["buy_signal"] = analysis["buy_signal"]
    result["note"] = analysis["note"]

    targets = await get_targets_by_url(result["url"])
    for target in targets:
        t_price = target.get("target_price")
        
        if t_price is not None:
            result["target_price"] = t_price
            
        if t_price is not None and result["price_value"] is not None and result["price_value"] <= t_price:
            result["alert_hit"] = True
            sent, error = await run_in_threadpool(
                send_price_alert_sync,
                target.get("email", ""),
                result["product_name"],
                result["price"],
                t_price,
                result["url"],
            )
            result["alert_status"] = "sent" if sent else "failed"
            result["alert_error"] = error

    saved, error = await save_price({
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
    })

    if saved:
        result["storage_status"] = "saved"
        await update_target_after_scan(result)
    else:
        result["storage_status"] = "failed"
        result["note"] = result["note"] + " MongoDB chua luu duoc: " + error

    return result

@router.get("/check-price")
async def check_price(url: str):
    raw_result = await scrape_product(url)
    result = await process_result(raw_result)
    return jsonable_encoder(result)

@router.post("/scan")
async def scan(data: ScanRequest):
    raw_results = await scrape_products(data.urls)
    results = []
    success_count = 0

    for item in raw_results:
        processed = await process_result(item)
        if processed["success"]:
            success_count += 1
        results.append(jsonable_encoder(processed))

    return {
        "summary": {
            "total": len(results),
            "success": success_count,
            "failed": len(results) - success_count,
            "mode": "concurrent",
        },
        "results": results,
    }

@router.get("/history")
async def history(url: str, limit: int = 30):
    data = await get_history(url, limit)
    return jsonable_encoder({"url": url, "history": data, "count": len(data)})

@router.get("/ai-insight")
async def ai_insight(url: str, product_name: str = "Sản phẩm", current_user: str = Depends(get_current_user)):
    data = await get_history(url, limit=30)
    insight = await generate_insight(product_name, data)
    return jsonable_encoder({"url": url, "insight": insight})

@router.post("/chat")
async def chat_api(data: ChatRequest, current_user: str = Depends(get_current_user)):
    history_data = await get_history(data.url, limit=30)
    reply = await chat_with_ai(data.product_name, history_data, data.message, data.history)
    return jsonable_encoder({"reply": reply})

@router.get("/overview")
async def overview(limit: int = 20):
    data = await get_latest_prices(limit)
    for item in data:
        item["success"] = True
        item["storage_status"] = "saved"
        item["analysis"] = await analyze_price(item["url"], item.get("price_value"))
    return jsonable_encoder({"items": data, "count": len(data)})

@router.get("/watchlist")
async def watchlist(limit: int = 30, current_user: str = Depends(get_current_user)):
    data = await get_targets(current_user, limit)
    return jsonable_encoder({"items": data, "count": len(data)})

@router.post("/watchlist")
async def create_watch(data: TargetRequest, platform: str = "unknown", product_name: str = "", current_user: str = Depends(get_current_user)):
    saved, error = await save_target(
        data.url,
        data.target_price,
        current_user,
        platform,
        product_name,
    )
    return {
        "saved": saved,
        "error": error,
        "url": data.url,
        "target_price": data.target_price,
        "email": current_user,
    }
