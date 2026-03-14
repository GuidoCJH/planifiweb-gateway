from dataclasses import dataclass

from app.models import (
    PLANIFIWEB_INSTITUTIONAL_PLAN,
    PLANIFIWEB_PLAN,
    PLANIFIWEB_SCOPE,
    PLANIFIWEB_START_PLAN,
)


@dataclass(frozen=True)
class PaymentPlan:
    code: str
    name: str
    price: float
    currency: str
    payment_method: str
    product_code: str


PLAN_CATALOG: dict[str, PaymentPlan] = {
    PLANIFIWEB_START_PLAN: PaymentPlan(
        code=PLANIFIWEB_START_PLAN,
        name="Plan Start",
        price=9.0,
        currency="PEN",
        payment_method="yape",
        product_code=PLANIFIWEB_SCOPE,
    ),
    PLANIFIWEB_PLAN: PaymentPlan(
        code=PLANIFIWEB_PLAN,
        name="Plan Pro",
        price=19.0,
        currency="PEN",
        payment_method="yape",
        product_code=PLANIFIWEB_SCOPE,
    ),
    PLANIFIWEB_INSTITUTIONAL_PLAN: PaymentPlan(
        code=PLANIFIWEB_INSTITUTIONAL_PLAN,
        name="Plan Institucional",
        price=39.0,
        currency="PEN",
        payment_method="yape",
        product_code=PLANIFIWEB_SCOPE,
    ),
}


def get_payment_plan(plan_code: str) -> PaymentPlan | None:
    return PLAN_CATALOG.get(plan_code.strip().lower())
