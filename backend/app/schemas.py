from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

Status = Literal["new", "contacted", "follow_up_needed", "replied", "won", "lost"]
Tone = Literal["professional", "friendly", "concise"]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Credentials(Input):
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=8, max_length=72)

    @field_validator("password")
    @classmethod
    def password_bytes(cls, value):
        if len(value.encode()) > 72:
            raise ValueError("Password must be at most 72 UTF-8 bytes")
        return value


class LeadInput(Input):
    name: str = Field(min_length=1, max_length=200)
    company: str = Field(default="", max_length=200)
    email: str = Field(default="", max_length=254)
    phone: str = Field(default="", max_length=50)
    service_requested: str = Field(default="", max_length=500)
    inquiry_message: str = Field(default="", max_length=10000)
    notes: str = Field(default="", max_length=10000)
    status: Status = "new"

    @model_validator(mode="after")
    def contact(self):
        if not self.email and not self.phone:
            raise ValueError("Email or phone required")
        if self.email:
            from pydantic import TypeAdapter

            self.email = str(TypeAdapter(EmailStr).validate_python(self.email)).lower()
        return self


class SettingsInput(Input):
    business_name: str = Field(default="My Business", min_length=1, max_length=200)
    industry: str = Field(default="", max_length=200)
    services: list[str] = Field(default_factory=list, max_length=100)
    description: str = Field(default="", max_length=10000)
    tone: Tone = "professional"
    signature: str = Field(default="", max_length=2000)
    followup_intervals_days: list[int] = Field(default=[2, 5, 10], max_length=30)
    timezone: str = Field(default="America/Toronto", max_length=100)
    send_hour_local: int = Field(default=9, ge=0, le=23)
    ai_provider: Literal["demo", "openai_compatible", "anthropic"] = "demo"
    ai_base_url: str = Field(default="https://api.openai.com/v1", max_length=2000)
    ai_model: str = Field(default="gpt-4o-mini", max_length=200)
    ai_api_key: str | None = Field(default=None, max_length=2000)
    onboarding_complete: bool = False
    demo_mode: bool = False

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value):
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Unknown IANA timezone")
        return value

    @field_validator("services")
    @classmethod
    def valid_services(cls, value):
        if any(len(item) > 500 for item in value):
            raise ValueError("Service too long")
        return value

    @field_validator("followup_intervals_days")
    @classmethod
    def valid_intervals(cls, value):
        if any(day < 1 or day > 365 for day in value):
            raise ValueError("Intervals must be between 1 and 365 days")
        return value

    @field_validator("ai_base_url")
    @classmethod
    def valid_url(cls, value):
        from urllib.parse import urlparse

        parsed = urlparse(value)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username
            or parsed.password
        ):
            raise ValueError("Use an HTTP(S) URL without credentials")
        return value.rstrip("/")


class StatusInput(Input):
    status: Status


class GenerateInput(Input):
    kind: Literal["initial", "follow_up"] | None = None
    tone: Tone | None = None
    regenerate: bool = False


class DraftEdit(Input):
    subject: str | None = Field(default=None, min_length=1, max_length=1000)
    body: str | None = Field(default=None, min_length=1, max_length=30000)


class DeleteInput(Input):
    confirm: Literal["DELETE ALL DATA"]
