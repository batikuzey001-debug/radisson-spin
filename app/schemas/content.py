from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ImageCard(BaseModel):
    id: int
    imageUrl: Optional[str] = None
    # ileride genişletmek için yer: accentColor/bgColor/variant

class HomeFeed(BaseModel):
    tournaments: List[ImageCard]
    dailyBonuses: List[ImageCard]
    promoCodes: List[ImageCard]
    events: List[ImageCard]
    serverTime: datetime

class SummaryOut(BaseModel):
    activeCounts: dict
    nextToEnd: Optional[dict] = None
    serverTime: datetime
