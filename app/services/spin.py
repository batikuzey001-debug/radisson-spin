from uuid import uuid4
from typing import Dict

# verify→commit arası geçici rezerve token (memory)
# Not: ileride Redis/DB'ye taşıyacağız.
RESERVED: Dict[str, str] = {}

def new_token() -> str:
    return str(uuid4())
