from pydantic import BaseModel
from typing import List

class ScanRequest(BaseModel):
    urls: List[str]

class TargetRequest(BaseModel):
    url: str
    target_price: int
    email: str = ""
