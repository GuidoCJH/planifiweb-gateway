import re


MULTISPACE_RE = re.compile(r"\s+")


def normalize_email(value: str) -> str:
    return value.strip().lower()


def is_gmail_email(value: str) -> bool:
    return normalize_email(value).endswith("@gmail.com")


def is_allowed_email_domain(value: str, allowed_domains: list[str] | set[str] | tuple[str, ...]) -> bool:
    normalized = normalize_email(value)
    if "@" not in normalized:
        return False
    if not allowed_domains:
        return True
    domain = normalized.rsplit("@", 1)[-1]
    return domain in {item.strip().lower() for item in allowed_domains if item.strip()}


def normalize_person_name(value: str) -> str:
    cleaned = MULTISPACE_RE.sub(" ", value.strip())
    if not cleaned:
        return cleaned
    return " ".join(
        chunk[:1].upper() + chunk[1:].lower()
        for chunk in cleaned.split(" ")
    )
