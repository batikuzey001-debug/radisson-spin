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
    codes = relationship("Code", back_populates="prize")


class Code(Base):
    __tablename__ = "codes"
    code: Mapped[str] = mapped_column(String(64), primary_key=True)
    username: Mapped[str | None] = mapped_column(String(128), nullable=True)
    prize_id: Mapped[int] = mapped_column(ForeignKey("prizes.id"))
    status: Mapped[str] = mapped_column(String(16), default="issued")  # issued|used|expired
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    prize = relationship("Prize", back_populates="codes")


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
    slug          = Column(String(200), unique=True, index=True)  # URL-dostu
    title         = Column(String(200), nullable=False)
    subtitle      = Column(String(200))            # kart alt başlığı
    short_desc    = Column(Text)                   # kart kısa açıklama
    long_desc     = Column(Text)                   # modal/detay açıklama
    image_url     = Column(String(512), nullable=False)
    banner_url    = Column(String(512))            # landing/hero görseli
    cta_url       = Column(String(512))            # KATIL butonu hedefi
    status        = Column(String(20), default="draft")  # draft|published|archived
    start_at      = Column(DateTime(timezone=True))
    end_at        = Column(DateTime(timezone=True))
    category      = Column(String(50))
    is_pinned     = Column(Boolean, default=False)
    priority      = Column(Integer, default=0)
    prize_pool    = Column(Integer)                # ₺
    participant_count = Column(Integer)            # katılımcı
    rank_visible  = Column(Boolean, default=False) # liderlik açık mı
    # kozmetik override
    accent_color  = Column(String(16))
    bg_color      = Column(String(16))
    variant       = Column(String(24))
    # i18n (ileriye dönük)
    i18n          = Column(JSON)                   # {"tr-TR": {...}, "en-US": {...}}
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
    # --- Hızlı Bonus Kartları için ek alanlar ---
    coupon_code = Column(String(64))               # Why: Kartta gösterilecek kod/kopyalama için
    cta_url     = Column(String(512))              # Why: (ops.) detay/hedef linki
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
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow)

# --- ANA SAYFA SLIDER (Admin sadece görsel/metin girer) ---
class HomeBanner(Base):
    __tablename__ = "home_banners"
    id         = Column(Integer, primary_key=True)
    title      = Column(String(200))                 # 1. metin (opsiyonel)
    subtitle   = Column(String(300))                 # 2. metin (opsiyonel)
    image_url  = Column(String(512), nullable=False) # görsel url (zorunlu)
    order      = Column(Integer, default=1)          # 1,2,3...
    is_active  = Column(Boolean, default=True)       # yayında mı
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow)

# --- SITE CONFIG (CMS: logo, login CTA vb.) ---
class SiteConfig(Base):
    """
    Why: Logo ve giriş butonu gibi basit ayarları admin CMS üzerinden yönetmek için.
    Not: key benzersizdir (ör: 'logo_url', 'login_cta_text', 'login_cta_url').
    """
    __tablename__ = "site_config"
    key        = Column(String(100), primary_key=True)   # benzersiz anahtar
    value_text = Column(Text, nullable=True)             # değer (metin/url)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow)
