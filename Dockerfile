# ---------- STAGE 0: WEB (React/Vite) DERLEME ----------
FROM node:20-alpine AS web
WORKDIR /web

# lock varsa npm ci, yoksa npm install
COPY web/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

# tüm web kodu ve build
COPY web/ ./
RUN npm run build

# ---------- STAGE 1: PYTHON (FastAPI) ----------
FROM python:3.12-slim AS app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# psycopg2 için sistem kütüphanesi
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq-dev curl \
 && rm -rf /var/lib/apt/lists/*

# Python bağımlılıkları
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Backend kodu
COPY app/ ./app

# Web çıktısı -> FastAPI static
COPY --from=web /web/dist /app/static

EXPOSE 8000
ENV PORT=8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
