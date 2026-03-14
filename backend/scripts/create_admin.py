import argparse
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.auth import get_password_hash
from app.config import get_settings
from app.db import engine
from app.models import User
from app.normalization import normalize_email, normalize_person_name
from app.subscription import next_billing_cycle


def upsert_admin(email: str, password: str, name: str) -> None:
    normalized_email = normalize_email(email)
    normalized_name = normalize_person_name(name)
    settings = get_settings()
    accepted_at = datetime.now(timezone.utc)
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == normalized_email)).first()
        if user is None:
            user = User(
                email=normalized_email,
                name=normalized_name,
                hashed_password=get_password_hash(password),
                is_admin=True,
                subscription_status="active",
                subscription_scope="planifiweb",
                active_plan="planifiweb_pro",
                subscription_expires_at=next_billing_cycle(),
                terms_accepted_at=accepted_at,
                privacy_accepted_at=accepted_at,
                accepted_terms_version=settings.legal_terms_version,
                accepted_privacy_version=settings.legal_privacy_version,
            )
            session.add(user)
            session.commit()
            print(f"Admin created: {normalized_email}")
            return

        user.name = normalized_name
        user.hashed_password = get_password_hash(password)
        user.is_admin = True
        user.subscription_status = "active"
        user.subscription_scope = "planifiweb"
        user.active_plan = "planifiweb_pro"
        user.subscription_expires_at = next_billing_cycle()
        user.terms_accepted_at = accepted_at
        user.privacy_accepted_at = accepted_at
        user.accepted_terms_version = settings.legal_terms_version
        user.accepted_privacy_version = settings.legal_privacy_version
        session.add(user)
        session.commit()
        print(f"Admin updated: {normalized_email}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or update admin user")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", default="Admin")
    args = parser.parse_args()
    upsert_admin(args.email, args.password, args.name)


if __name__ == "__main__":
    main()
