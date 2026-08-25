import os
import uuid

import pytest
from minio import Minio

from app.storage import download_audio


@pytest.fixture
def uploaded_object(tmp_path):
    """A real object put into the local MinIO bucket, cleaned up after —
    mirrors what nest's upload endpoint does, so download_audio is
    exercised against the same storage the rest of the app writes to."""
    client = Minio(
        f"{os.environ['MINIO_ENDPOINT']}:{os.environ['MINIO_PORT']}",
        access_key=os.environ["MINIO_ROOT_USER"],
        secret_key=os.environ["MINIO_ROOT_PASSWORD"],
        secure=False,
    )
    bucket = os.environ["MINIO_BUCKET"]
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)

    key = f"{uuid.uuid4()}.txt"
    content = b"not real audio, just proving the download path works"
    source_path = tmp_path / "source.txt"
    source_path.write_bytes(content)
    client.fput_object(bucket, key, str(source_path))

    yield key, content

    client.remove_object(bucket, key)


def test_download_audio_fetches_the_object_to_the_destination_dir(uploaded_object, tmp_path):
    key, content = uploaded_object
    destination_dir = tmp_path / "downloaded"
    destination_dir.mkdir()

    path = download_audio(key, str(destination_dir))

    assert os.path.exists(path)
    with open(path, "rb") as f:
        assert f.read() == content
