# app/db/models.py
from datetime import datetime
import enum

from sqlalchemy import (
    Integer, String, Text, DateTime, ForeignKey, text, Enum, Boolean
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


# === Çekiliş Modelleri ===
class Prize(Base):
    __tablename__ = "prizes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    label: Mapped[str] = mapped_column(String(64))
    wheel_index: Mapped[int] = mapped_column(Integer)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # İLİŞKİLER
    # -> Code.prize_id ile bağlanan kodlar (asıl kazanılan ödül)
    codes = relationship(
        "Code",
        back_populates="prize",
        foreign_keys="Code.prize_id",   # AMBIGUITY FIX
        cascade="save-update, merge",
    )
    # -> Code.manual_prize_id ile bağlanan kodlar (rapor/okuma)
    manual_codes = relationship(
        "Code",
        foreign_keys="Code.manual_prize_id",
        viewonly=True,
    )

    # -> Çark dağılım ilişkisi
    distributions = relationship(
        "PrizeDistribution",
        back_populates="prize",
        cascade="all, delete-orphan",
    )


class Code(Base):
    __tablename__ = "codes"
    code: Mapped[str] = mapped_column(String(64), primary_key=True)
    username: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Spin sonrası dolacak -> nullable
    prize_id: Mapped[int | None] = mapped_column(ForeignKey("prizes.id"), nullable=True)

    # Kodun seviyesini tutar (dinamik tier; prize_tiers.key)
    tier_key: Mapped[str | None] = mapped_column(String(32), nullable=True)

    # Kod oluştururken manuel ödül atanırsa (opsiyonel, tek seferlik)
    manual_prize_id: Mapped[int | None] = mapped_column(ForeignKey("prizes.id"), nullable=True)

    status: Mapped[str] = mapped_column(String(16), default="issued")  # issued|used|expired
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    # İLİŞKİLER
    prize = relationship(
        "Prize",
        back_populates="codes",
        foreign_keys=[prize_id],        # yalnızca prize_id ile bağla
    )


class Spin(Base):
    __tablename__ = "spins"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # uuid str
    code: Mapped[str] = mapped_column(String(64))
    username: Mapped[str] = mapped_column(String(128))
    prize_id: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    client_ip: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)


# === Admin RBAC ===
class AdminRole(str, enum.Enum):
    super_admin = "super_admin"
    admin = "admin"


class AdminUser(Base):
    __tablename__ = "admin_users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    role: Mapped[AdminRole] = mapped_column(Enum(AdminRole), default=AdminRole.admin, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))  # bcrypt hash
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

# --- FEED MODELLERİ (Turnuva + diğerleri) ---
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON
from datetime import datetime, timezone

def _utcnow(): return datetime.now(timezone.utc)

class Tournament(Base):
    __tablename__ = "tournaments"
    id            = Column(Integer, primary_key=True)
    slug          = Column(String(200), unique=True, index=True)
    title         = Column(String(200), nullable=False)
    subtitle      = Column(String(200))
    short_desc    = Column(Text)
    long_desc     = Column(Text)
    image_url     = Column(String(512), nullable=False)
    banner_url    = Column(String(512))
    cta_url       = Column(String(512))
    status        = Column(String(20), default="draft")
    start_at      = Column(DateTime(timezone=True))
    end_at        = Column(DateTime(timezone=True))
    category      = Column(String(50))
    is_pinned     = Column(Boolean, default=False)
    priority      = Column(Integer, default=0)
    prize_pool    = Column(Integer)
    participant_count = Column(Integer)
    rank_visible  = Column(Boolean, default=False)
    accent_color  = Column(String(16))
    bg_color      = Column(String(16))
    variant       = Column(String(24))
    i18n          = Column(JSON)
    created_at    = Column(DateTime(timezone=True), default=_utcnow)
    updated_at    = Column(DateTime(timezone=True), default=_utcnow)

class DailyBonus(Base):
    __tablename__ = "daily_bonuses"
    id         = Column(Integer, primary_key=True)
    title      = Column(String(200), nullable=False)
    image_url  = Column(String(512), nullable=False)
    status     = Column(String(20), default="draft")
    start_at   = Column(DateTime(timezone=True))
    end_at     = Column(DateTime(timezone=True))
    category   = Column(String(50))
    is_pinned  = Column(Boolean, default=False)
    priority   = Column(Integer, default=0)
    accent_color = Column(String(16))
    bg_color     = Column(String(16))
    variant      = Column(String(24))
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow)

class PromoCode(Base):
    __tablename__ = "promo_codes"
    id         = Column(Integer, primary_key=True)
    title      = Column(String(200), nullable=False)
    image_url  = Column(String(512), nullable=False)
    status     = Column(String(20), default="draft")
    start_at   = Column(DateTime(timezone=True))
    end_at     = Column(DateTime(timezone=True))
    category   = Column(String(50))
    is_pinned  = Column(Boolean, default=False)
    priority   = Column(Integer, default=0)
    accent_color = Column(String(16))
    bg_color     = Column(String(16))
    variant      = Column(String(24))
    coupon_code  = Column(String(64))
    cta_url      = Column(String(512))
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow)

class Event(Base):
    __tablename__ = "events"
    id         = Column(Integer, primary_key=True)
    title      = Column(String(200), nullable=False)
    image_url  = Column(String(512), nullable=False)
    status     = Column(String(20), default="draft")
    start_at   = Column(DateTime(timezone=True))
    end_at     = Column(DateTime(timezone=True))
    category   = Column(String(50))
    is_pinned  = Column(Boolean, default=False)
    priority   = Column(Integer, default=0)
    accent_color = Column(String(16))
    bg_color     = Column(String(16))
    variant      = Column(String(24))
    # YENİ: Etkinlik ödül miktarı (₺)
    prize_amount = Column(Integer)   # <-- eklendi
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow)

# --- ANA SAYFA SLIDER ---
class HomeBanner(Base):
    __tablename__ = "home_banners"
    id         = Column(Integer, primary_key=True)
    title      = Column(String(200))
    subtitle   = Column(String(300))
    image_url  = Column(String(512), nullable=False)
    order      = Column(Integer, default=1)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow)

# --- SITE CONFIG ---
class SiteConfig(Base):
    __tablename__ = "site_config"
    key        = Column(String(100), primary_key=True)
    value_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow)

# --- DİNAMİK SEVİYELER (Admin tarafından yönetilebilir) ---
class PrizeTier(Base):
    __tablename__ = "prize_tiers"
    # Örn. key: "bronze", "silver-300", "custom-1"
    key: Mapped[str] = mapped_column(String(32), primary_key=True)
    label: Mapped[str] = mapped_column(String(100))          # Örn. "100 TL"
    sort: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    # ilişkiler
    distributions = relationship("PrizeDistribution", back_populates="tier", cascade="all, delete-orphan")

# --- ÇARK DAĞILIMI (Seviye -> Ödül -> Ağırlık) ---
class PrizeDistribution(Base):
    __tablename__ = "prize_distributions"
    id: Mapped[int] = mapped_column(Integer, primary key=True, autoincrement=True)

    # Dinamik seviye anahtarı: prize_tiers.key
    tier_key: Mapped[str] = mapped_column(ForeignKey("prize_tiers.key"), index=True)

    prize_id: Mapped[int] = mapped_column(ForeignKey("prizes.id"), index=True)
    weight_bp: Mapped[int] = mapped_column(Integer, default=0)    # 1% = 100 basis point
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # ilişkiler
    prize = relationship("Prize", back_populates="distributions")
    tier  = relationship("PrizeTier", back_populates="distributions")
