from pydantic import BaseModel
from typing import List, Dict, Optional

class ScanRequest(BaseModel):
    urls: List[str]

class TargetRequest(BaseModel):
    url: str
    target_price: int
    email: str = ""

class ChatRequest(BaseModel):
    url: str
    product_name: str
    message: str
    history: List[Dict] = []
