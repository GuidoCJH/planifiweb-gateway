import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import boto3

from app.config import get_settings


@dataclass
class StoredFile:
    key: str
    url: str


@dataclass
class ReceiptAccess:
    kind: str
    location: str


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


def get_storage_service() -> StorageService:
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
        raise RuntimeError(
            "S3 storage is required in production. Set S3_BUCKET, "
            "S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY."
        )

    return LocalStorageService(settings.local_upload_dir)
