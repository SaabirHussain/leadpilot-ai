import asyncio
import csv
import hashlib
import io
import json
import os
import secrets
import time
from contextlib import asynccontextmanager, suppress
from datetime import timedelta, timezone
from pathlib import Path
from typing import Literal
from zoneinfo import ZoneInfo

import bcrypt
from fastapi import Depends, FastAPI, HTTPException, Request, Response, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from itsdangerous import BadSignature, URLSafeTimedSerializer
from pydantic import ValidationError
from sqlalchemy import create_engine, delete, event, func, or_, select
from sqlalchemy.orm import sessionmaker
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import ai
from .followups import TERMINAL, calculate_due, cancel_pending, contacted, sweep
from .models import (
    Activity,
    Base,
    BusinessSettings,
    Draft,
    DraftRevision,
    FollowUp,
    Lead,
    Owner,
    SchemaVersion,
    now,
)
from .schemas import (
    Credentials,
    DeleteInput,
    DraftEdit,
    GenerateInput,
    LeadInput,
    SettingsInput,
    StatusInput,
)

CSV_FIELDS = [
    "name",
    "company",
    "email",
    "phone",
    "service_requested",
    "inquiry_message",
    "notes",
    "status",
]


def serialize(obj):
    return {
        column.name: (
            getattr(obj, column.name).isoformat() + "Z"
            if column.type.python_type.__name__ == "datetime" and getattr(obj, column.name)
            else getattr(obj, column.name)
        )
        for column in obj.__table__.columns
    }


def private_write(path, value):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    os.fchmod(fd, 0o600)
    with os.fdopen(fd, "w") as handle:
        handle.write(value)


def create_app(data_dir=None, background=None):
    directory = Path(data_dir or os.getenv("DATA_DIR", "./data")).resolve()
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    secret_file = directory / "secret_key"
    secret = os.getenv("SECRET_KEY")
    if not secret:
        if not secret_file.exists():
            private_write(secret_file, secrets.token_urlsafe(48))
        secret = secret_file.read_text()
    signer = URLSafeTimedSerializer(secret, salt="leadpilot-session")
    engine = create_engine(
        f"sqlite:///{directory / 'leadpilot.db'}", connect_args={"check_same_thread": False}
    )

    @event.listens_for(engine, "connect")
    def configure_sqlite(connection, record):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    sessions = sessionmaker(engine, expire_on_commit=False)
    with sessions.begin() as db:
        if not db.get(SchemaVersion, 1):
            db.add(SchemaVersion())
        if not db.get(BusinessSettings, 1):
            db.add(BusinessSettings())
    enabled = (
        background
        if background is not None
        else os.getenv("BACKGROUND_ENABLED", "true").lower() == "true"
    )

    async def worker():
        while True:
            with sessions() as db:
                sweep(db)
            await asyncio.sleep(max(1, int(os.getenv("SWEEP_INTERVAL_SECONDS", "60"))))

    @asynccontextmanager
    async def lifespan(app):
        task = asyncio.create_task(worker()) if enabled else None
        yield
        if task:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task
        engine.dispose()

    app = FastAPI(title="LeadPilot AI", lifespan=lifespan)
    app.state.sessions = sessions
    failures = {}

    def db_session():
        with sessions() as db:
            yield db

    def authenticated(request):
        try:
            token = signer.loads(request.cookies.get("leadpilot_session", ""), max_age=86400 * 7)
            with sessions() as db:
                owner = db.get(Owner, 1)
                return bool(
                    owner and token == hashlib.sha256(owner.password_hash.encode()).hexdigest()
                )
        except BadSignature:
            return False

    @app.middleware("http")
    async def guard(request, call_next):
        path = request.url.path
        if path.startswith("/api"):
            inbound = path == "/api/inbound/lead"
            if (
                request.method not in {"GET", "HEAD", "OPTIONS"}
                and not inbound
                and request.headers.get("X-Requested-With") != "LeadPilot"
            ):
                return JSONResponse(
                    {"error": {"code": 403, "message": "X-Requested-With: LeadPilot required"}},
                    status_code=403,
                )
            public = path in {"/api/auth/status", "/api/auth/setup", "/api/auth/login"}
            if not public and not inbound and not authenticated(request):
                return JSONResponse(
                    {"error": {"code": 401, "message": "Authentication required"}}, status_code=401
                )
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(StarletteHTTPException)
    async def http_error(request, exc):
        return JSONResponse(
            {"error": {"code": exc.status_code, "message": exc.detail}}, status_code=exc.status_code
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        details = [{"location": list(item["loc"]), "message": item["msg"]} for item in exc.errors()]
        return JSONResponse(
            {"error": {"code": 422, "message": "Validation failed", "details": details}},
            status_code=422,
        )

    @app.exception_handler(Exception)
    async def unexpected_error(request, exc):
        return JSONResponse(
            {"error": {"code": 500, "message": "Internal server error"}}, status_code=500
        )

    def get_lead(db, lead_id):
        obj = db.get(Lead, lead_id)
        if not obj:
            raise HTTPException(404, "Lead not found")
        return obj

    def activity(db, lead_id, kind, message):
        db.add(Activity(lead_id=lead_id, type=kind, message=message))

    def change_status(db, lead, status):
        if status == "contacted":
            try:
                contacted(db, lead, db.get(BusinessSettings, 1))
            except ValueError as exc:
                raise HTTPException(409, str(exc)) from None
        else:
            lead.status = status
            if status in TERMINAL:
                cancel_pending(db, lead, status)
            elif status == "new" and not lead.opted_out:
                lead.next_follow_up_at = now()
        activity(db, lead.id, "status", f"Status changed to {status}")

    def add_lead(db, payload, source="manual", is_demo=False):
        fields = payload.model_dump()
        status = fields.pop("status")
        lead = Lead(**fields, source=source, is_demo=is_demo)
        db.add(lead)
        db.flush()
        activity(db, lead.id, "created", "Lead created")
        if status != "new":
            change_status(db, lead, status)
        return lead

    def set_cookie(response, owner):
        response.set_cookie(
            "leadpilot_session",
            signer.dumps(hashlib.sha256(owner.password_hash.encode()).hexdigest()),
            httponly=True,
            samesite="strict",
            secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
            max_age=86400 * 7,
        )

    @app.get("/api/auth/status")
    def auth_status(request: Request, db=Depends(db_session)):
        return {"setup_required": db.get(Owner, 1) is None, "authenticated": authenticated(request)}

    @app.post("/api/auth/setup")
    def setup(payload: Credentials, response: Response, db=Depends(db_session)):
        if db.get(Owner, 1):
            raise HTTPException(409, "Owner already exists")
        owner = Owner(
            email=str(payload.email).lower(),
            password_hash=bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode(),
        )
        db.add(owner)
        db.commit()
        set_cookie(response, owner)
        return {"authenticated": True}

    @app.post("/api/auth/login")
    def login(payload: Credentials, request: Request, response: Response, db=Depends(db_session)):
        ip = request.client.host if request.client else "unknown"
        recent = [stamp for stamp in failures.get(ip, []) if stamp > time.monotonic() - 60]
        failures[ip] = recent
        if len(recent) >= 5:
            raise HTTPException(429, "Too many failed logins; retry in one minute")
        owner = db.get(Owner, 1)
        if (
            not owner
            or owner.email != str(payload.email).lower()
            or not bcrypt.checkpw(payload.password.encode(), owner.password_hash.encode())
        ):
            recent.append(time.monotonic())
            raise HTTPException(401, "Invalid credentials")
        failures.pop(ip, None)
        set_cookie(response, owner)
        return {"authenticated": True}

    @app.post("/api/auth/logout")
    def logout(response: Response):
        response.delete_cookie("leadpilot_session")
        return {"authenticated": False}

    def api_key():
        if os.getenv("LEADPILOT_AI_API_KEY"):
            return os.environ["LEADPILOT_AI_API_KEY"]
        path = directory / "secrets.json"
        return json.loads(path.read_text()).get("ai_api_key", "") if path.exists() else ""

    @app.get("/api/settings")
    def settings_get(db=Depends(db_session)):
        result = serialize(db.get(BusinessSettings, 1))
        result.pop("inbound_token_hash")
        result["ai_api_key_configured"] = bool(api_key())
        return result

    @app.patch("/api/settings")
    def settings_update(payload: SettingsInput, db=Depends(db_session)):
        settings = db.get(BusinessSettings, 1)
        for key, value in payload.model_dump(exclude_unset=True, exclude={"ai_api_key"}).items():
            setattr(settings, key, value)
        if payload.ai_api_key is not None:
            private_write(
                directory / "secrets.json", json.dumps({"ai_api_key": payload.ai_api_key})
            )
        db.commit()
        return settings_get(db)

    def ai_call(db, lead, kind, tone, followup_step=None):
        settings = db.get(BusinessSettings, 1)
        context = {
            "lead": {key: getattr(lead, key) for key in CSV_FIELDS if key != "status"},
            "business": {
                key: getattr(settings, key)
                for key in ["business_name", "industry", "services", "description", "signature"]
            },
            "kind": kind,
            "tone": tone,
            "followup_step": followup_step,
        }
        try:
            return ai.generate(
                context, settings.ai_provider, settings.ai_base_url, settings.ai_model, api_key()
            )
        except ValueError as exc:
            raise HTTPException(502, str(exc)) from None

    @app.post("/api/settings/ai/test")
    def ai_test(db=Depends(db_session)):
        result = ai_call(
            db,
            Lead(
                name="Test",
                email="test@example.com",
                company="",
                service_requested="test inquiry",
                inquiry_message="Hello",
                notes="",
                phone="",
            ),
            "initial",
            "concise",
        )
        return {"ok": True, "sample": result}

    @app.post("/api/settings/inbound-token")
    def inbound_token(db=Depends(db_session)):
        token = secrets.token_urlsafe(32)
        db.get(BusinessSettings, 1).inbound_token_hash = hashlib.sha256(token.encode()).hexdigest()
        db.commit()
        return {"token": token}

    @app.post("/api/inbound/lead", status_code=201)
    def inbound(payload: LeadInput, request: Request, db=Depends(db_session)):
        expected = db.get(BusinessSettings, 1).inbound_token_hash
        supplied = request.headers.get("Authorization", "")
        if (
            not expected
            or not supplied.startswith("Bearer ")
            or not secrets.compare_digest(
                hashlib.sha256(supplied[7:].encode()).hexdigest(), expected
            )
        ):
            raise HTTPException(401, "Invalid inbound token")
        lead = add_lead(db, payload, "webhook")
        db.commit()
        return serialize(lead)

    @app.get("/api/leads/import/template")
    def import_template():
        return Response(",".join(CSV_FIELDS) + "\r\n", media_type="text/csv")

    @app.post("/api/leads/import")
    async def import_csv(file: UploadFile, dry_run: bool = False, db=Depends(db_session)):
        content = await file.read(2 * 1024 * 1024 + 1)
        if len(content) > 2 * 1024 * 1024:
            raise HTTPException(413, "CSV exceeds 2 MB")
        try:
            reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")), strict=True)
            if not reader.fieldnames or set(reader.fieldnames) != set(CSV_FIELDS):
                raise HTTPException(422, "CSV headers must match the template")
            rows = []
            for row in reader:
                if len(rows) >= 5000:
                    raise HTTPException(413, "CSV exceeds 5000 rows")
                rows.append(row)
        except (UnicodeDecodeError, csv.Error):
            raise HTTPException(422, "CSV must be valid UTF-8 CSV") from None
        existing = {value.lower() for value in db.scalars(select(Lead.email)) if value}
        preview, errors, created, skipped = [], [], 0, 0
        for index, row in enumerate(rows, 2):
            try:
                payload = LeadInput.model_validate(row)
            except ValidationError as exc:
                errors.append({"row": index, "messages": [e["msg"] for e in exc.errors()]})
                continue
            if payload.email and payload.email in existing:
                skipped += 1
                continue
            if payload.email:
                existing.add(payload.email)
            created += 1
            preview.append({"row": index, **payload.model_dump()})
            if not dry_run:
                add_lead(db, payload, "csv")
        if not dry_run:
            db.commit()
        return {
            "created": created,
            "skipped": skipped,
            "errors": len(errors),
            "row_errors": errors,
            "preview": preview if dry_run else [],
            "dry_run": dry_run,
        }

    def due_bucket(lead, settings):
        if not lead.next_follow_up_at:
            return "none"
        local_today = (
            now().replace(tzinfo=timezone.utc).astimezone(ZoneInfo(settings.timezone)).date()
        )
        due_day = (
            lead.next_follow_up_at.replace(tzinfo=timezone.utc)
            .astimezone(ZoneInfo(settings.timezone))
            .date()
        )
        return (
            "overdue"
            if due_day < local_today
            else "today"
            if due_day == local_today
            else "upcoming"
        )

    @app.get("/api/leads")
    def leads_list(
        search: str = "",
        status: Literal["new", "contacted", "follow_up_needed", "replied", "won", "lost"]
        | None = None,
        follow_up_due: Literal["overdue", "today", "upcoming", "none"] | None = None,
        sort: Literal["created_at", "name", "next_follow_up_at", "status"] = "created_at",
        order: Literal["asc", "desc"] = "desc",
        page: int = 1,
        page_size: int = 25,
        db=Depends(db_session),
    ):
        if page < 1 or not 1 <= page_size <= 200 or len(search) > 500:
            raise HTTPException(422, "Invalid pagination or search")
        query = select(Lead)
        if search:
            query = query.where(
                or_(
                    *(
                        getattr(Lead, field).ilike(f"%{search}%")
                        for field in ["name", "company", "email", "service_requested"]
                    )
                )
            )
        if status:
            query = query.where(Lead.status == status)
        column = getattr(Lead, sort)
        items = list(
            db.scalars(query.order_by(column.asc() if order == "asc" else column.desc(), Lead.id))
        )
        if follow_up_due:
            settings = db.get(BusinessSettings, 1)
            items = [lead for lead in items if due_bucket(lead, settings) == follow_up_due]
        return {
            "items": [serialize(lead) for lead in items[(page - 1) * page_size : page * page_size]],
            "total": len(items),
            "page": page,
            "page_size": page_size,
        }

    @app.post("/api/leads", status_code=201)
    def leads_create(payload: LeadInput, db=Depends(db_session)):
        lead = add_lead(db, payload)
        db.commit()
        return serialize(lead)

    @app.get("/api/leads/{lead_id}")
    def lead_detail(lead_id: int, db=Depends(db_session)):
        result = serialize(get_lead(db, lead_id))
        for key, model in [("activity", Activity), ("drafts", Draft), ("followups", FollowUp)]:
            result[key] = [
                serialize(item)
                for item in db.scalars(
                    select(model).where(model.lead_id == lead_id).order_by(model.id.desc())
                )
            ]
        return result

    @app.patch("/api/leads/{lead_id}")
    def lead_update(lead_id: int, payload: dict, db=Depends(db_session)):
        lead = get_lead(db, lead_id)
        try:
            updated = LeadInput.model_validate(
                {**{key: getattr(lead, key) for key in CSV_FIELDS}, **payload}
            )
        except ValidationError:
            raise HTTPException(422, "Invalid lead fields") from None
        for key, value in updated.model_dump(exclude={"status"}).items():
            setattr(lead, key, value)
        if updated.status != lead.status:
            change_status(db, lead, updated.status)
        activity(db, lead.id, "edited", "Lead updated")
        db.commit()
        return serialize(lead)

    @app.post("/api/leads/{lead_id}/status")
    def lead_status(lead_id: int, payload: StatusInput, db=Depends(db_session)):
        lead = get_lead(db, lead_id)
        change_status(db, lead, payload.status)
        db.commit()
        return serialize(lead)

    @app.post("/api/leads/{lead_id}/opt-out")
    def opt_out(lead_id: int, db=Depends(db_session)):
        lead = get_lead(db, lead_id)
        lead.opted_out = True
        cancel_pending(db, lead, "opted out")
        activity(db, lead.id, "opt_out", "Lead opted out")
        db.commit()
        return serialize(lead)

    @app.delete("/api/leads/{lead_id}")
    def lead_delete(lead_id: int, db=Depends(db_session)):
        db.delete(get_lead(db, lead_id))
        db.commit()
        return {"deleted": True}

    @app.post("/api/leads/{lead_id}/drafts/generate")
    def draft_generate(lead_id: int, payload: GenerateInput, db=Depends(db_session)):
        lead = get_lead(db, lead_id)
        if lead.opted_out or lead.status in TERMINAL:
            raise HTTPException(409, "Drafts blocked for opted-out or closed leads")
        kind = "follow_up" if lead.last_contacted_at else "initial"
        if payload.kind and payload.kind != kind:
            raise HTTPException(409, "Draft kind does not match contact history")
        followup = (
            db.scalar(
                select(FollowUp).where(FollowUp.lead_id == lead.id, FollowUp.status == "pending")
            )
            if kind == "follow_up"
            else None
        )
        if kind == "follow_up" and not followup:
            raise HTTPException(409, "No pending follow-up step")
        followup_id = followup.id if followup else None
        previous = db.scalar(
            select(Draft)
            .where(
                Draft.lead_id == lead.id,
                Draft.followup_id == followup_id,
                Draft.kind == kind,
                Draft.status != "discarded",
            )
            .order_by(Draft.id.desc())
        )
        if previous and not payload.regenerate:
            return {"draft": serialize(previous), "duplicate": True}
        if previous:
            if previous.status == "sent":
                raise HTTPException(409, "Cannot regenerate a sent draft")
            previous.status = "discarded"
        settings = db.get(BusinessSettings, 1)
        tone = payload.tone or settings.tone
        result = ai_call(db, lead, kind, tone, followup.step if followup else None)
        draft = Draft(
            lead_id=lead.id,
            followup_id=followup_id,
            kind=kind,
            tone=tone,
            **result,
            generated_by="demo"
            if settings.ai_provider == "demo"
            else f"{settings.ai_provider}:{settings.ai_model}",
            warnings=ai.warnings_for(result["subject"] + " " + result["body"]),
        )
        db.add(draft)
        activity(db, lead.id, "draft_generated", "Draft generated for human review")
        db.commit()
        return {"draft": serialize(draft), "duplicate": False}

    def get_draft(db, draft_id):
        draft = db.get(Draft, draft_id)
        if not draft:
            raise HTTPException(404, "Draft not found")
        return draft

    @app.patch("/api/drafts/{draft_id}")
    def draft_edit(draft_id: int, payload: DraftEdit, db=Depends(db_session)):
        draft = get_draft(db, draft_id)
        if draft.status not in {"draft", "approved"}:
            raise HTTPException(409, "Draft is no longer editable")
        db.add(DraftRevision(draft_id=draft.id, subject=draft.subject, body=draft.body))
        for key, value in payload.model_dump(exclude_unset=True).items():
            if value is None:
                raise HTTPException(422, "Draft fields cannot be null")
            setattr(draft, key, value)
        draft.status = "draft"
        draft.warnings = ai.warnings_for(draft.subject + " " + draft.body)
        activity(db, draft.lead_id, "draft_edited", "Draft edited; human approval required")
        db.commit()
        return serialize(draft)

    @app.get("/api/drafts/{draft_id}/revisions")
    def revisions(draft_id: int, db=Depends(db_session)):
        get_draft(db, draft_id)
        return [
            serialize(item)
            for item in db.scalars(
                select(DraftRevision)
                .where(DraftRevision.draft_id == draft_id)
                .order_by(DraftRevision.id.desc())
            )
        ]

    @app.post("/api/drafts/{draft_id}/{action}")
    def draft_action(
        draft_id: int, action: Literal["approve", "mark-sent", "discard"], db=Depends(db_session)
    ):
        draft = get_draft(db, draft_id)
        lead = get_lead(db, draft.lead_id)
        if draft.status in {"sent", "discarded"}:
            raise HTTPException(409, "Draft is already finalized")
        if action != "discard" and (lead.opted_out or lead.status in TERMINAL):
            raise HTTPException(409, "Lead is not eligible for contact")
        if action == "mark-sent":
            if draft.status != "approved":
                raise HTTPException(409, "Approve draft before marking sent")
            if draft.kind == "initial" and lead.last_contacted_at:
                raise HTTPException(409, "Initial reply is stale; generate the current follow-up")
            completed = db.get(FollowUp, draft.followup_id) if draft.followup_id else None
            if completed and completed.status != "pending":
                raise HTTPException(409, "Follow-up is no longer pending")
            contacted(db, lead, db.get(BusinessSettings, 1), completed)
            draft.status = "sent"
        else:
            draft.status = "approved" if action == "approve" else "discarded"
        activity(
            db,
            lead.id,
            "draft_" + action,
            "Draft " + action + " recorded; no email sent by LeadPilot",
        )
        db.commit()
        return serialize(draft)

    @app.get("/api/reminders")
    def reminders(db=Depends(db_session)):
        sweep(db)
        settings = db.get(BusinessSettings, 1)
        result = {"overdue": [], "today": [], "upcoming": []}
        for lead in db.scalars(
            select(Lead).where(Lead.next_follow_up_at.is_not(None), Lead.opted_out.is_(False))
        ):
            bucket = due_bucket(lead, settings)
            if bucket != "upcoming" or lead.next_follow_up_at <= now() + timedelta(days=7):
                result[bucket].append(serialize(lead))
        return result

    @app.get("/api/activity")
    def activity_list(db=Depends(db_session)):
        return [
            serialize(item)
            for item in db.scalars(select(Activity).order_by(Activity.id.desc()).limit(100))
        ]

    @app.get("/api/dashboard")
    def dashboard(db=Depends(db_session)):
        groups = reminders(db)
        leads = list(db.scalars(select(Lead)))
        return {
            "counts_by_status": {
                status: sum(lead.status == status for lead in leads)
                for status in ["new", "contacted", "follow_up_needed", "replied", "won", "lost"]
            },
            "outstanding_followups": sum(lead.next_follow_up_at is not None for lead in leads),
            "overdue_count": len(groups["overdue"]),
            "recent_activity": activity_list(db),
            "leads_needing_attention": groups["overdue"] + groups["today"],
        }

    @app.get("/api/export")
    def export(format: Literal["json", "csv"] = "json", db=Depends(db_session)):
        if format == "json":
            return {
                name: [serialize(obj) for obj in db.scalars(select(model))]
                for name, model in [
                    ("leads", Lead),
                    ("drafts", Draft),
                    ("activity", Activity),
                    ("followups", FollowUp),
                    ("revisions", DraftRevision),
                ]
            }
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(CSV_FIELDS)
        for lead in db.scalars(select(Lead)):
            values = [getattr(lead, key) for key in CSV_FIELDS]
            writer.writerow(
                [
                    "'" + value if value.lstrip().startswith(("=", "+", "-", "@")) else value
                    for value in values
                ]
            )
        return Response(
            output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="leadpilot-leads.csv"'},
        )

    @app.delete("/api/data")
    def delete_data(payload: DeleteInput, include_settings: bool = False, db=Depends(db_session)):
        db.execute(delete(Lead))
        db.execute(delete(Activity))
        if include_settings:
            db.execute(delete(Owner))
            db.execute(delete(BusinessSettings))
            db.add(BusinessSettings())
            (directory / "secrets.json").unlink(missing_ok=True)
        db.commit()
        return {"deleted": True, "setup_required": include_settings}

    @app.post("/api/demo/load")
    def demo_load(db=Depends(db_session)):
        if db.scalar(select(Lead).where(Lead.is_demo.is_(True))):
            return {"loaded": False, "message": "Demo data already loaded"}
        seed = json.loads((Path(__file__).resolve().parents[2] / "demo/seed.json").read_text())
        settings = db.get(BusinessSettings, 1)
        for key, value in seed["settings"].items():
            setattr(settings, key, value)
        anchor = now()
        for row in seed["leads"]:
            timeline = row["timeline"]
            payload = {key: value for key, value in row.items() if key != "timeline"}
            lead = add_lead(db, LeadInput(**{**payload, "status": "new"}), "demo", True)
            lead.created_at = anchor - timedelta(hours=timeline["created_hours_ago"])
            lead.status = payload["status"]
            for item in db.scalars(select(Activity).where(Activity.lead_id == lead.id)):
                item.created_at = lead.created_at
            db.add(
                Activity(
                    lead_id=lead.id,
                    type="demo_note",
                    message="Fictional demo inquiry received and reviewed",
                    created_at=lead.created_at + timedelta(minutes=5),
                )
            )
            if "contacted_hours_ago" in timeline:
                lead.last_contacted_at = anchor - timedelta(hours=timeline["contacted_hours_ago"])
                db.add(
                    Activity(
                        lead_id=lead.id,
                        type="contacted",
                        message="Demo: owner recorded a personally sent reply",
                        created_at=lead.last_contacted_at,
                    )
                )
                lead.next_follow_up_at = None
            if "due_days_offset" in timeline:
                due = calculate_due(
                    anchor, timeline["due_days_offset"], settings.timezone, settings.send_hour_local
                )
                lead.next_follow_up_at = due
                step = timeline["step"]
                for previous_step in range(1, step):
                    db.add(
                        FollowUp(
                            lead_id=lead.id,
                            step=previous_step,
                            due_at=lead.last_contacted_at - timedelta(days=1),
                            status="done",
                        )
                    )
                db.add(FollowUp(lead_id=lead.id, step=step, due_at=due))
            if "status_hours_ago" in timeline:
                db.add(
                    Activity(
                        lead_id=lead.id,
                        type="status",
                        message=f"Demo: status changed to {lead.status}",
                        created_at=anchor - timedelta(hours=timeline["status_hours_ago"]),
                    )
                )
        db.commit()
        sweep(db)
        return {"loaded": True}

    @app.post("/api/demo/simulate-inquiry", status_code=201)
    def simulate(db=Depends(db_session)):
        seed = json.loads((Path(__file__).resolve().parents[2] / "demo/seed.json").read_text())
        count = db.scalar(
            select(func.count()).select_from(Activity).where(Activity.type == "demo_simulated")
        )
        row = seed["simulated_inquiries"][count % len(seed["simulated_inquiries"])]
        lead = add_lead(
            db,
            LeadInput(**row),
            "demo",
            True,
        )
        activity(db, lead.id, "demo_simulated", "Fictional website inquiry simulated")
        db.commit()
        return serialize(lead)

    @app.delete("/api/demo")
    def demo_delete(db=Depends(db_session)):
        db.execute(delete(Lead).where(Lead.is_demo.is_(True)))
        db.get(BusinessSettings, 1).demo_mode = False
        db.commit()
        return {"deleted": True}

    dist = Path(os.getenv("FRONTEND_DIST", "../frontend/dist")).resolve()
    if dist.is_dir() and (dist / "index.html").exists():
        if (dist / "assets").is_dir():
            app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

        @app.get("/{path:path}", include_in_schema=False)
        def spa(path: str):
            if path == "api" or path.startswith("api/"):
                raise HTTPException(404, "API route not found")
            candidate = (dist / path).resolve()
            return FileResponse(
                candidate
                if candidate.is_relative_to(dist) and candidate.is_file()
                else dist / "index.html"
            )

    return app


app = create_app()
