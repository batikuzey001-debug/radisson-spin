@@ -19,9 +19,9 @@
from app.api.routers.home import router as home_router
from app.api.routers.site import router as site_router
from app.api.routers.live import router as live_router
from app.api.routers.schedule import router as schedule_router   # /api/schedule/...
from app.api.routers.promos import router as promos_router       # /api/promos/...
from app.api.routers.events import router as events_router       # /api/events/...
from app.api.routers.schedule import router as schedule_router
from app.api.routers.promos import router as promos_router
from app.api.routers.events import router as events_router
from app.api.routers.admin_mod import admin_router
from app.db.session import SessionLocal, engine
from app.db.models import Base, Prize, Code
@@ -215,7 +215,7 @@ def on_startup() -> None:
            END $$;
            """))

            # --- prize_tiers: tablo + seed (PL/pgSQL yerine plain SQL) ---
            # --- prize_tiers: tablo + seed (plain SQL) ---
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS prize_tiers (
                    key VARCHAR(32) PRIMARY KEY,
@@ -243,7 +243,7 @@ def on_startup() -> None:
                "ON CONFLICT (key) DO NOTHING;"
            ))

            # prize_distributions tablosu yoksa oluştur + indexler (plain SQL)
            # prize_distributions tablosu yoksa oluştur + indexler
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS prize_distributions (
                    id SERIAL PRIMARY KEY,
@@ -267,7 +267,7 @@ def on_startup() -> None:
            except Exception:
                pass  # zaten var

    # Seed örneği (spin için)
    # Seed (Ödül ve Kod örneği)
    with SessionLocal() as db:
        if db.query(Prize).count() == 0:
            db.add_all([
@@ -279,14 +279,31 @@ def on_startup() -> None:
            db.commit()

        if db.query(Code).count() == 0:
            p1000 = db.query(Prize).filter_by(label="₺1000").first()
            p500  = db.query(Prize).filter_by(label="₺500").first()
            if p1000 and p500:
                db.add_all([
                    Code(code="ABC123",  username="yasin", prize_id=None, tier_key="platinum", status="issued"),
                    Code(code="TEST500", username=None,    prize_id=None, tier_key="gold",     status="issued"),
                ])
                db.commit()
            db.add_all([
                Code(code="ABC123",  username="yasin", prize_id=None, tier_key="platinum", status="issued"),
                Code(code="TEST500", username=None,    prize_id=None, tier_key="gold",     status="issued"),
            ])
            db.commit()

    # ---- prize_distributions için otomatik başlangıç verisi ----
    # Amaç: Ödüller sekmesi 500 vermesin diye her aktif tier için en az 1 satır olsun.
    # Strateji: Eğer bir tier için hiç satır yoksa, wheel_index'i en küçük olan ödüle %100 ver.
    with engine.begin() as conn:
        # prize var mı?
        has_prize = conn.execute(text("SELECT EXISTS(SELECT 1 FROM prizes)")).scalar()
        if has_prize:
            # her aktif tier için yoksa seed ekle
            conn.execute(text("""
                INSERT INTO prize_distributions(tier_key, prize_id, weight_bp, enabled)
                SELECT pt.key,
                       (SELECT id FROM prizes ORDER BY wheel_index ASC LIMIT 1) AS prize_id,
                       10000, TRUE
                FROM prize_tiers pt
                WHERE pt.enabled = TRUE
                  AND NOT EXISTS (
                      SELECT 1 FROM prize_distributions pd WHERE pd.tier_key = pt.key
                  );
            """))

# -----------------------------
# Lokal çalıştırma kolaylığı
