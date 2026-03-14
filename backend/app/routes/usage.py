from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.auth import get_current_user
from app.db import get_session
from app.models import User
from app.schemas import UsageStatus
from app.subscription import build_usage_status

router = APIRouter(prefix="/usage", tags=["usage"])


@router.get("/me", response_model=UsageStatus)
def read_usage_me(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return build_usage_status(session, current_user)
