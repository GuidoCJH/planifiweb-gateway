from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.auth import get_current_user
from app.db import get_session
from app.models import User
from app.schemas import SessionState, SubscriptionStatusResponse
from app.subscription import build_session_state

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=SessionState)
def read_current_user(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return build_session_state(session, current_user)


@router.get("/subscription", response_model=SubscriptionStatusResponse)
def get_subscription_status(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return build_session_state(session, current_user)
