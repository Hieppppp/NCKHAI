"""MinIO client wrapper for file storage."""

import os
import io
from minio import Minio
from minio.error import S3Error

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_PUBLIC_ENDPOINT = os.getenv("MINIO_PUBLIC_ENDPOINT", "localhost:9002")  # Browser-accessible
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
    """Get a presigned URL for downloading.
    Create a MinIO client bound to public endpoint directly (not internal endpoint).
    Signature is computed based on that endpoint, so URL is browser-accessible.
    """
    from datetime import timedelta
    from urllib.parse import urlparse

    # Parse public endpoint to check if it has a scheme
    public = MINIO_PUBLIC_ENDPOINT
    if public.startswith(("http://", "https://")):
        parsed = urlparse(public)
        public = parsed.netloc
        secure = parsed.scheme == "https"
    else:
        secure = MINIO_SECURE

    # Create client with public endpoint + explicit region (skip bucket location lookup)
    public_client = Minio(
        public,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=secure,
        region="us-east-1",  # Skip auto-detect which requires network call
    )
    return public_client.presigned_get_object(
        MINIO_BUCKET, object_name, expires=timedelta(hours=expires_hours)
    )


def delete_file(object_name: str) -> None:
    client = get_client()
    client.remove_object(MINIO_BUCKET, object_name)
