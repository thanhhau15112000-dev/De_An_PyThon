import asyncio
from fastapi import APIRouter, BackgroundTasks, Depends, Request
from fastapi.encoders import jsonable_encoder
from starlette.concurrency import run_in_threadpool

from app.models.schemas import ScanRequest, TargetRequest, ChatRequest
from app.services.scraper import STORE_CONFIG, scrape_product, scrape_products
from app.services.analysis import analyze_price, save_price, get_history, get_latest_prices, get_targets, save_target, get_targets_by_url, update_target_after_scan, now
from app.services.ai_insight import generate_insight, chat_with_ai
from app.services.mailer import send_price_alert_sync
from app.core.security import get_current_user, get_optional_user

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

async def process_result(result: dict, background_tasks: BackgroundTasks = None, current_user: str = None):
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
    
    user_target_price = None
    user_alert_hit = False

    targets = await get_targets_by_url(result["url"])
    for target in targets:
        t_price = target.get("target_price")
        target_email = target.get("email", "")
        
        if current_user and target_email == current_user:
            if t_price is not None:
                user_target_price = t_price
            if t_price is not None and result["price_value"] is not None and result["price_value"] <= t_price:
                user_alert_hit = True
                
        if t_price is not None and result["price_value"] is not None and result["price_value"] <= t_price:
            if background_tasks:
                background_tasks.add_task(
                    send_price_alert_sync,
                    target_email,
                    result["product_name"],
                    result["price"],
                    t_price,
                    result["url"],
                )
            else:
                await run_in_threadpool(
                    send_price_alert_sync,
                    target_email,
                    result["product_name"],
                    result["price"],
                    t_price,
                    result["url"],
                )

    result["target_price"] = user_target_price
    result["alert_hit"] = user_alert_hit

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
async def check_price(url: str, background_tasks: BackgroundTasks, current_user: str = Depends(get_optional_user)):
    raw_result = await scrape_product(url)
    result = await process_result(raw_result, background_tasks, current_user)
    return jsonable_encoder(result)

@router.post("/scan")
async def scan(data: ScanRequest, background_tasks: BackgroundTasks, current_user: str = Depends(get_optional_user)):
    raw_results = await scrape_products(data.urls)
    
    tasks = [process_result(item, background_tasks, current_user) for item in raw_results]
    processed_results = await asyncio.gather(*tasks)
    
    results = [jsonable_encoder(p) for p in processed_results]
    success_count = sum(1 for p in results if p["success"])

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

TIER_LIMITS = {
    "free": 1,
    "premium": 10,
    "max": 100
}

@router.get("/me")
async def get_me(current_user: str = Depends(get_current_user)):
    from app.database.connection import db_ctx
    db_user = await db_ctx.db["users"].find_one({"email": current_user})
    tier = db_user.get("tier", "free") if db_user else "free"
    
    # Get current targets count
    targets_count = await db_ctx.db["watchlist"].count_documents({"email": current_user})
    
    return {
        "email": current_user,
        "tier": tier,
        "targets_count": targets_count,
        "targets_limit": TIER_LIMITS.get(tier, 1)
    }

@router.post("/watchlist")
async def create_watch(data: TargetRequest, platform: str = "unknown", product_name: str = "", current_user: str = Depends(get_current_user)):
    from app.database.connection import db_ctx
    from fastapi import HTTPException
    
    # Check limit before adding
    db_user = await db_ctx.db["users"].find_one({"email": current_user})
    tier = db_user.get("tier", "free") if db_user else "free"
    limit = TIER_LIMITS.get(tier, 1)
    
    # Check if this URL is already in watchlist (updating an existing one doesn't count towards limit)
    existing = await db_ctx.db["watchlist"].find_one({"url": data.url, "email": current_user})
    
    if not existing:
        current_count = await db_ctx.db["watchlist"].count_documents({"email": current_user})
        if current_count >= limit:
            raise HTTPException(
                status_code=400, 
                detail=f"Đã đạt giới hạn số lượng mục tiêu của gói {tier.upper()} ({limit} mục tiêu). Vui lòng nâng cấp gói cước để thêm sản phẩm mới."
            )

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
from pydantic import BaseModel

class CheckoutRequest(BaseModel):
    tier: str

@router.post("/sepay/checkout")
async def create_checkout(data: CheckoutRequest, current_user: str = Depends(get_current_user)):
    from app.services.sepay_pg import generate_sepay_checkout_payload
    from fastapi import HTTPException
    
    tier = data.tier.lower()
    if tier == "premium":
        amount = 49000
    elif tier == "max":
        amount = 499000
    else:
        raise HTTPException(status_code=400, detail="Gói cước không hợp lệ")
        
    payload = generate_sepay_checkout_payload(current_user, tier, amount)
    return payload
@router.post("/sepay/webhook")
async def sepay_webhook(request: Request):
    from app.database.connection import db_ctx
    from app.services.analysis import now
    import re
    
    try:
        data = await request.json()
    except Exception:
        return {"status": "error", "message": "Invalid JSON"}
        
    content = str(data.get("content", data.get("transactionContent", ""))).upper()
    try:
        amount = int(data.get("amountIn", data.get("transferAmount", 0)))
    except ValueError:
        amount = 0
    
    # Syntax: UPGRADE <email>
    match = re.search(r'UPGRADE\s+([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})', content)
    if not match:
        return {"status": "error", "message": "No UPGRADE syntax found"}
        
    email = match.group(1).lower()
    
    tier = "free"
    if amount >= 499000:
        tier = "max"
    elif amount >= 49000:
        tier = "premium"
    else:
        return {"status": "error", "message": f"Insufficient amount: {amount}"}
        
    db_user = await db_ctx.db["users"].find_one({"email": email})
    if db_user:
        await db_ctx.db["users"].update_one(
            {"email": email},
            {"$set": {"tier": tier}}
        )
        await db_ctx.db["transactions"].insert_one({
            "email": email,
            "amount": amount,
            "tier_upgraded": tier,
            "content": content,
            "created_at": now()
        })
        return {"status": "success", "message": f"Upgraded {email} to {tier}"}
    
    return {"status": "error", "message": "User not found"}

@router.post("/force-trigger")
async def force_trigger(background_tasks: BackgroundTasks):
    from app.services.scheduler import scan_all_targets_job
    background_tasks.add_task(scan_all_targets_job, force=True)
    return {"message": "Đã ép buộc hệ thống khởi chạy quá trình quét giá (Force Trigger). Hãy kiểm tra Terminal Log."}
