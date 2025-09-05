# app/schemas/prize.py (Pydantic v2)
from pydantic import BaseModel, Field, ConfigDict
class PrizeOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, ser_json_timedelta="iso8601")
    id: int
    label: str
    wheel_index: int = Field(alias="wheelIndex", serialization_alias="wheelIndex")
    image_url: str | None = Field(default=None, alias="imageUrl", serialization_alias="imageUrl")
