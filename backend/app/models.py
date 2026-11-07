from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Base(DeclarativeBase):
    pass


class SchemaVersion(Base):
    __tablename__ = "schema_version"
    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    version: Mapped[int] = mapped_column(default=1)


class Owner(Base):
    __tablename__ = "owner"
    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    email: Mapped[str] = mapped_column(String(254))
    password_hash: Mapped[str] = mapped_column(String(128))


class BusinessSettings(Base):
    __tablename__ = "settings"
    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    business_name: Mapped[str] = mapped_column(default="My Business")
    industry: Mapped[str] = mapped_column(default="")
    services: Mapped[list] = mapped_column(JSON, default=list)
    description: Mapped[str] = mapped_column(default="")
    tone: Mapped[str] = mapped_column(default="professional")
    signature: Mapped[str] = mapped_column(default="")
    followup_intervals_days: Mapped[list] = mapped_column(JSON, default=lambda: [2, 5, 10])
    timezone: Mapped[str] = mapped_column(default="America/Toronto")
    send_hour_local: Mapped[int] = mapped_column(default=9)
    ai_provider: Mapped[str] = mapped_column(default="demo")
    ai_base_url: Mapped[str] = mapped_column(default="https://api.openai.com/v1")
    ai_model: Mapped[str] = mapped_column(default="gpt-4o-mini")
    onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False)
    demo_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    inbound_token_hash: Mapped[str | None] = mapped_column(nullable=True)


class Lead(Base):
    __tablename__ = "leads"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    company: Mapped[str] = mapped_column(default="")
    email: Mapped[str] = mapped_column(default="")
    phone: Mapped[str] = mapped_column(default="")
    service_requested: Mapped[str] = mapped_column(default="")
    inquiry_message: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(default="new")
    opted_out: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(default="manual")
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    last_contacted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    next_follow_up_at: Mapped[datetime | None] = mapped_column(DateTime, default=now, nullable=True)


class FollowUp(Base):
    __tablename__ = "followups"
    id: Mapped[int] = mapped_column(primary_key=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id", ondelete="CASCADE"))
    step: Mapped[int] = mapped_column(Integer)
    due_at: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(default="pending")
    cancel_reason: Mapped[str | None] = mapped_column(nullable=True)


class Draft(Base):
    __tablename__ = "drafts"
    id: Mapped[int] = mapped_column(primary_key=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id", ondelete="CASCADE"))
    followup_id: Mapped[int | None] = mapped_column(
        ForeignKey("followups.id", ondelete="CASCADE"), nullable=True
    )
    kind: Mapped[str] = mapped_column(default="initial")
    tone: Mapped[str] = mapped_column(default="professional")
    subject: Mapped[str] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(default="draft")
    generated_by: Mapped[str] = mapped_column(String)
    warnings: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)


class DraftRevision(Base):
    __tablename__ = "draft_revisions"
    id: Mapped[int] = mapped_column(primary_key=True)
    draft_id: Mapped[int] = mapped_column(ForeignKey("drafts.id", ondelete="CASCADE"))
    subject: Mapped[str] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Activity(Base):
    __tablename__ = "activity"
    id: Mapped[int] = mapped_column(primary_key=True)
    lead_id: Mapped[int | None] = mapped_column(
        ForeignKey("leads.id", ondelete="CASCADE"), nullable=True
    )
    type: Mapped[str] = mapped_column(String)
    message: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
