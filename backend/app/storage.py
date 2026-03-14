import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import boto3
from fastapi import Depends
from sqlmodel import Session, select

from app.config import get_settings
from app.db import get_session
from app.models import StoredReceipt


@dataclass
class StoredFile:
    key: str
    url: str


@dataclass
class ReceiptAccess:
    kind: str
    location: str | None = None
    content: bytes | None = None


class StorageService:
    def upload_receipt(
        self,
        content: bytes,
        filename: str,
        content_type: str,
        user_id: int,
    ) -> StoredFile:
        raise NotImplementedError

    def resolve_receipt(self, key: str, url: str) -> ReceiptAccess:
        raise NotImplementedError


class LocalStorageService(StorageService):
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def upload_receipt(
        self,
        content: bytes,
        filename: str,
        content_type: str,
        user_id: int,
    ) -> StoredFile:
        extension = Path(filename).suffix or ".bin"
        unique_name = (
            f"{user_id}_{int(datetime.now(timezone.utc).timestamp())}_{uuid.uuid4().hex}{extension}"
        )
        target = self.base_dir / unique_name
        target.write_bytes(content)
        return StoredFile(
            key=str(target),
            url=f"/{target.as_posix()}",
        )

    def resolve_receipt(self, key: str, url: str) -> ReceiptAccess:
        return ReceiptAccess(kind="local", location=key)


class DatabaseStorageService(StorageService):
    def __init__(self, session: Session):
        self.session = session

    def upload_receipt(
        self,
        content: bytes,
        filename: str,
        content_type: str,
        user_id: int,
    ) -> StoredFile:
        extension = Path(filename).suffix or ".bin"
        storage_key = (
            f"db/{user_id}/{int(datetime.now(timezone.utc).timestamp())}_{uuid.uuid4().hex}{extension}"
        )
        receipt = StoredReceipt(
            storage_key=storage_key,
            owner_user_id=user_id,
            filename=filename,
            content_type=content_type,
            byte_size=len(content),
            content=content,
        )
        self.session.add(receipt)
        self.session.flush()
        return StoredFile(
            key=storage_key,
            url=f"db://{storage_key}",
        )

    def resolve_receipt(self, key: str, url: str) -> ReceiptAccess:
        receipt = self.session.exec(
            select(StoredReceipt).where(StoredReceipt.storage_key == key)
        ).first()
        if receipt is None:
            raise FileNotFoundError(key)
        return ReceiptAccess(kind="inline", content=receipt.content)


class S3StorageService(StorageService):
    def __init__(
        self,
        bucket: str,
        access_key_id: str,
        secret_access_key: str,
        region: str | None = None,
        endpoint_url: str | None = None,
        public_base_url: str | None = None,
    ):
        self.bucket = bucket
        self.public_base_url = public_base_url.rstrip("/") if public_base_url else None
        client_kwargs = {
            "aws_access_key_id": access_key_id,
            "aws_secret_access_key": secret_access_key,
        }
        if region:
            client_kwargs["region_name"] = region
        if endpoint_url:
            client_kwargs["endpoint_url"] = endpoint_url
        self.client = boto3.client("s3", **client_kwargs)

    def upload_receipt(
        self,
        content: bytes,
        filename: str,
        content_type: str,
        user_id: int,
    ) -> StoredFile:
        extension = Path(filename).suffix or ".bin"
        key = (
            f"receipts/{user_id}/{int(datetime.now(timezone.utc).timestamp())}_{uuid.uuid4().hex}{extension}"
        )
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=content,
            ContentType=content_type,
        )
        if self.public_base_url:
            url = f"{self.public_base_url}/{key}"
        else:
            url = f"s3://{self.bucket}/{key}"
        return StoredFile(key=key, url=url)

    def resolve_receipt(self, key: str, url: str) -> ReceiptAccess:
        settings = get_settings()
        presigned_url = self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=settings.receipt_url_ttl_seconds,
        )
        return ReceiptAccess(kind="redirect", location=presigned_url)


def get_storage_backend() -> str:
    settings = get_settings()
    if settings.use_s3_storage:
        return "s3"

    if settings.is_production:
        return "database"

    return "local"


def get_storage_service(session: Session = Depends(get_session)) -> StorageService:
    settings = get_settings()
    if settings.use_s3_storage:
        return S3StorageService(
            bucket=settings.s3_bucket or "",
            access_key_id=settings.s3_access_key_id or "",
            secret_access_key=settings.s3_secret_access_key or "",
            region=settings.s3_region,
            endpoint_url=settings.s3_endpoint_url,
            public_base_url=settings.s3_public_base_url,
        )

    if settings.is_production:
        return DatabaseStorageService(session)

    return LocalStorageService(settings.local_upload_dir)
