import os
from typing import List

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL env var is required")

    ADMIN_TOKEN: str = os.getenv("ADMIN_TOKEN", "changeme")
    CORS_ALLOW_ORIGINS: List[str] = ["*"]  # prod'da daralt

settings = Settings()
