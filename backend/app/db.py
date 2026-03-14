from sqlmodel import SQLModel, Session, create_engine

from app.config import get_settings

settings = get_settings()

connect_args = {}
if settings.effective_database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.effective_database_url,
    echo=settings.sql_echo and not settings.is_production,
    connect_args=connect_args,
)


def init_db() -> None:
    # Production schema should be managed with Alembic migrations.
    if settings.app_env.lower() in {"development", "dev", "test"}:
        SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
