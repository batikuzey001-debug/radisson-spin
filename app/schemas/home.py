# app/schemas/home.py
from pydantic import BaseModel
from typing import Optional

class HomeBannerOut(BaseModel):
    id: int
    title: Optional[str] = None
    subtitle: Optional[str] = None
    image_url: str
    order: int

    class Config:
        from_attributes = True
