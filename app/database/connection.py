from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_ctx = Database()

async def connect_to_mongo():
    logger.info("Connecting to MongoDB...")
    db_ctx.client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=3000)
    db_ctx.db = db_ctx.client[settings.MONGODB_DB_NAME]
    
    try:
        await db_ctx.db["price_history"].create_index("url")
        await db_ctx.db["watchlist"].create_index("url", unique=True)
        logger.info("Connected to MongoDB & verified indexes.")
    except Exception as e:
        logger.warning(f"Failed to create indexes, MongoDB might be down: {e}")

async def close_mongo_connection():
    if db_ctx.client:
        logger.info("Closing MongoDB connection...")
        db_ctx.client.close()

async def ping_database():
    if not db_ctx.client:
        return False
    try:
        await db_ctx.client.admin.command("ping")
        return True
    except Exception:
        return False
