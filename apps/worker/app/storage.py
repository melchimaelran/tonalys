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


def upload_audio(source_path: str, key: str) -> None:
    """Put a local file into the tracks bucket under `key`. Used for
    YouTube tracks: nest never uploads their audio (it only has the URL),
    so the worker stores the downloaded wav here for playback."""
    bucket = os.environ["MINIO_BUCKET"]
    _client().fput_object(bucket, key, source_path)
