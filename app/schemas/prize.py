from pydantic import BaseModel

class PrizeOut(BaseModel):
    id: int
    label: str
    wheelIndex: int
    imageUrl: str | None = None
