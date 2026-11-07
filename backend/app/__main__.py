import os
import argparse
import getpass
from pathlib import Path

import bcrypt
import uvicorn
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from .models import Owner


def reset_password(password):
    if not 8 <= len(password) or len(password.encode()) > 72:
        raise ValueError("Password must be at least 8 characters and at most 72 UTF-8 bytes")
    database = Path(os.getenv("DATA_DIR", "./data")).resolve() / "leadpilot.db"
    if not database.is_file():
        raise ValueError("No workspace database found. Check DATA_DIR.")
    engine = create_engine(f"sqlite:///{database}")
    try:
        with Session(engine) as db:
            owner = db.get(Owner, 1)
            if not owner:
                raise ValueError("No owner account found. Complete setup in your browser.")
            owner.password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            db.commit()
    finally:
        engine.dispose()


def main():
    parser = argparse.ArgumentParser(description="LeadPilot AI local server")
    parser.add_argument("command", nargs="?", choices=["serve", "reset-password"], default="serve")
    args = parser.parse_args()
    if args.command == "reset-password":
        password = getpass.getpass("New owner password: ")
        if password != getpass.getpass("Confirm new password: "):
            parser.error("Passwords do not match")
        try:
            reset_password(password)
        except ValueError as exc:
            parser.error(str(exc))
        print("Password reset. Existing sessions are invalid; log in again. Data was kept.")
    else:
        uvicorn.run(
            "app.main:app",
            host=os.getenv("HOST", "127.0.0.1"),
            port=int(os.getenv("PORT", "8000")),
            access_log=False,
        )


if __name__ == "__main__":
    main()
