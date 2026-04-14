"""MinIO client wrapper for file storage."""

import os
import io
from minio import Minio
from minio.error import S3Error

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "nckhai")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "nckhai_secret")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "uploads")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"

_client: Minio | None = None


def get_client() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=MINIO_SECURE,
        )
        # Ensure bucket exists
        if not _client.bucket_exists(MINIO_BUCKET):
            _client.make_bucket(MINIO_BUCKET)
    return _client


def upload_file(object_name: str, data: bytes, content_type: str) -> str:
    """Upload bytes to MinIO, returns the object name."""
    client = get_client()
    client.put_object(
        MINIO_BUCKET,
        object_name,
        io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )
    return object_name


def download_file(object_name: str) -> bytes:
    """Download file bytes from MinIO."""
    client = get_client()
    response = client.get_object(MINIO_BUCKET, object_name)
    data = response.read()
    response.close()
    response.release_conn()
    return data


def get_presigned_url(object_name: str, expires_hours: int = 24) -> str:
    """Get a presigned URL for downloading."""
    from datetime import timedelta

    client = get_client()
    return client.presigned_get_object(
        MINIO_BUCKET, object_name, expires=timedelta(hours=expires_hours)
    )


def delete_file(object_name: str) -> None:
    client = get_client()
    client.remove_object(MINIO_BUCKET, object_name)
