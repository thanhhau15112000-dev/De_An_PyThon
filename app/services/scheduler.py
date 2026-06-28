import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timezone
from app.database.connection import db_ctx
from app.services.scraper import scrape_products
from app.api.endpoints import process_result
from app.services.analysis import now

# Setup Logging màu mè để biểu diễn đồ án
class ColorFormatter(logging.Formatter):
    COLORS = {
        'INFO': '\033[94m',
        'WARNING': '\033[93m',
        'ERROR': '\033[91m',
        'RESET': '\033[0m'
    }
    def format(self, record):
        color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
        record.msg = f"{color}{record.msg}{self.COLORS['RESET']}"
        return super().format(record)

logger = logging.getLogger("Scheduler")
logger.setLevel(logging.INFO)
ch = logging.StreamHandler()
ch.setFormatter(ColorFormatter('%(asctime)s - [%(levelname)s] - %(message)s'))
if not logger.handlers:
    logger.addHandler(ch)

TIER_INTERVALS = {
    "free": 24 * 3600,   # 24 hours
    "premium": 3 * 3600, # 3 hours
    "max": 3600          # 1 hour
}

async def scan_all_targets_job(force: bool = False):
    logger.info("=== BẮT ĐẦU CHU KỲ QUÉT TỰ ĐỘNG ===")
    
    try:
        users_cursor = db_ctx.db["users"].find({})
        users = await users_cursor.to_list(length=1000)
        user_tiers = {u["email"]: u.get("tier", "free") for u in users}
        
        targets_cursor = db_ctx.db["watchlist"].find({})
        targets = await targets_cursor.to_list(length=5000)
        
        urls_to_scrape = set()
        current_time = datetime.fromisoformat(now())
        
        for target in targets:
            email = target.get("email")
            tier = user_tiers.get(email, "free")
            interval_secs = TIER_INTERVALS.get(tier, 24 * 3600)
            
            last_scraped = target.get("last_scraped_at")
            
            if force or not last_scraped:
                urls_to_scrape.add(target["url"])
            else:
                try:
                    last_time = datetime.fromisoformat(last_scraped)
                    delta = (current_time - last_time).total_seconds()
                    if delta >= interval_secs:
                        urls_to_scrape.add(target["url"])
                except Exception as e:
                    logger.error(f"Lỗi parse thời gian: {e}")
                    urls_to_scrape.add(target["url"])
                    
        if not urls_to_scrape:
            logger.info("Không có sản phẩm nào cần quét lúc này.")
            logger.info("=== KẾT THÚC CHU KỲ ===\n")
            return
            
        logger.info(f"Đang tiến hành cào dữ liệu {len(urls_to_scrape)} URL...")
        raw_results = await scrape_products(list(urls_to_scrape))
        
        logger.info("Đang ghi vào CSDL và kiểm tra Alert...")
        tasks = [process_result(item) for item in raw_results]
        await asyncio.gather(*tasks)
        
        logger.info(f"Hoàn tất xử lý {len(raw_results)} sản phẩm. Đã kiểm tra gửi email cảnh báo.")
        logger.info("=== KẾT THÚC CHU KỲ ===\n")
    except Exception as ex:
        logger.error(f"Lỗi hệ thống Scheduler: {ex}")

def start_scheduler():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(scan_all_targets_job, 'interval', minutes=1, id="scan_job")
    scheduler.start()
    logger.info("🚀 Background Scheduler đã khởi động! Chờ quét định kỳ mỗi phút.")
