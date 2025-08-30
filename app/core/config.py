import os
from typing import List

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL env var is required")

    # İlk süper admin oluşturmak için ENV
    ADMIN_BOOT_USERNAME: str = os.getenv("ADMIN_BOOT_USERNAME", "root")
    ADMIN_BOOT_PASSWORD: str = os.getenv("ADMIN_BOOT_PASSWORD", "changeme")  # prod'da değiştir!

    # Session için gizli anahtar
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-this-secret")

    CORS_ALLOW_ORIGINS: List[str] = ["*"]  # prod'da daralt

settings = Settings()
