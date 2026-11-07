from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select

from .models import Activity, FollowUp, Lead, now

TERMINAL = {"replied", "won", "lost"}


def calculate_due(contacted_at, interval_days, timezone_name, send_hour):
    local = contacted_at.replace(tzinfo=timezone.utc).astimezone(ZoneInfo(timezone_name))
    day = local.date() + timedelta(days=interval_days)
    due = datetime.combine(day, time(send_hour), ZoneInfo(timezone_name))
    # Round-trip resolves nonexistent spring-forward hours to the next valid local hour.
    return due.astimezone(timezone.utc).replace(tzinfo=None)


def cancel_pending(db, lead, reason):
    for followup in db.scalars(
        select(FollowUp).where(FollowUp.lead_id == lead.id, FollowUp.status == "pending")
    ):
        followup.status = "cancelled"
        followup.cancel_reason = reason
    lead.next_follow_up_at = None


def contacted(db, lead, settings, completed=None):
    if lead.opted_out or lead.status in TERMINAL:
        raise ValueError("Lead is not eligible for contact")
    history = list(db.scalars(select(FollowUp).where(FollowUp.lead_id == lead.id)))
    step = max((item.step for item in history), default=0) + 1
    cancel_pending(db, lead, "rescheduled after contact")
    if completed:
        completed.status = "done"
        completed.cancel_reason = None
    lead.last_contacted_at = now()
    lead.status = "contacted"
    if step <= len(settings.followup_intervals_days):
        due = calculate_due(
            lead.last_contacted_at,
            settings.followup_intervals_days[step - 1],
            settings.timezone,
            settings.send_hour_local,
        )
        db.add(FollowUp(lead_id=lead.id, step=step, due_at=due))
        lead.next_follow_up_at = due
    db.add(
        Activity(
            lead_id=lead.id,
            type="contacted",
            message="Contact recorded; follow-up schedule updated",
        )
    )


def sweep(db):
    for lead in db.scalars(
        select(Lead).where(Lead.next_follow_up_at <= now(), Lead.opted_out.is_(False))
    ):
        if lead.status == "contacted":
            lead.status = "follow_up_needed"
            db.add(Activity(lead_id=lead.id, type="overdue", message="Follow-up is due"))
    db.commit()
