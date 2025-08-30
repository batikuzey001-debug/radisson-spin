from datetime import datetime
from sqlalchemy import Integer, String, Text, DateTime, ForeignKey, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class Prize(Base):
    __tablename__ = "prizes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    label: Mapped[str] = mapped_column(String(64))
    wheel_index: Mapped[int] = mapped_column(Integer)
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
import enum
from sqlalchemy import Enum, Boolean

class AdminRole(str, enum.Enum):
    super_admin = "super_admin"
    admin = "admin"

class AdminUser(Base):
    __tablename__ = "admin_users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    role: Mapped[AdminRole] = mapped_column(Enum(AdminRole), default=AdminRole.admin, index=True)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True)  # SHA256(token)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
