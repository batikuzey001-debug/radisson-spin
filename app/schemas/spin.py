from pydantic import BaseModel

class VerifyIn(BaseModel):
    username: str
    code: str

class VerifyOut(BaseModel):
    ok: bool = True
    targetIndex: int
    prizeLabel: str
    spinToken: str

class CommitIn(BaseModel):
    code: str
    spinToken: str
from pydantic import BaseModel

class VerifyIn(BaseModel):
    username: str
    code: str

class VerifyOut(BaseModel):
    ok: bool = True
    targetIndex: int
    prizeLabel: str
    spinToken: str
    prizeImage: str | None = None  # <-- YENİ

class CommitIn(BaseModel):
    code: str
    spinToken: str
