from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.auth import get_current_user
from app.db import get_session
from app.models import User
from app.schemas import SubscriptionStatusResponse
from app.subscription import build_session_state

router = APIRouter(prefix="/subscription", tags=["subscription"])


@router.get("/status", response_model=SubscriptionStatusResponse)
def subscription_status(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return build_session_state(session, current_user)
