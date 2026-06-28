from fastapi import APIRouter, HTTPException, status
from app.models.schemas import UserCreate, UserLogin, Token
from app.core.security import get_password_hash, verify_password, create_access_token
from app.database.connection import db_ctx

router = APIRouter()

@router.post("/register", response_model=Token)
async def register(user: UserCreate):
    existing_user = await db_ctx.db["users"].find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    user_dict = {
        "email": user.email, 
        "hashed_password": hashed_password,
        "tier": "free"
    }
    await db_ctx.db["users"].insert_one(user_dict)
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(user: UserLogin):
    db_user = await db_ctx.db["users"].find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}
