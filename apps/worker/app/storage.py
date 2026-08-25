import os

from minio import Minio


def _client() -> Minio:
    return Minio(
        f"{os.environ['MINIO_ENDPOINT']}:{os.environ['MINIO_PORT']}",
        access_key=os.environ["MINIO_ROOT_USER"],
        secret_key=os.environ["MINIO_ROOT_PASSWORD"],
        secure=False,
    )


def download_audio(key: str, destination_dir: str) -> str:
    bucket = os.environ["MINIO_BUCKET"]
    path = os.path.join(destination_dir, key)
    _client().fget_object(bucket, key, path)
    return path
