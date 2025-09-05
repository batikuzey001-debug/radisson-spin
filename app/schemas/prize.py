from pydantic import BaseModel, Field

class PrizeOut(BaseModel):
    id: int
    label: str
    wheelIndex: int = Field(..., alias="wheel_index")
    imageUrl: str | None = Field(None, alias="image_url")

    class Config:
        orm_mode = True
        allow_population_by_field_name = True
