import json
import os
import time
import uuid

import pika
import psycopg2
import pytest
from fastapi.testclient import TestClient
from minio import Minio

from app.main import ANALYSIS_JOBS_QUEUE, app


def _publish(payload: dict) -> None:
    connection = pika.BlockingConnection(pika.URLParameters(os.environ["RABBITMQ_URL"]))
    channel = connection.channel()
    channel.queue_declare(queue=ANALYSIS_JOBS_QUEUE, durable=True)
    channel.basic_publish(
        exchange="",
        routing_key=ANALYSIS_JOBS_QUEUE,
        body=json.dumps(payload),
        properties=pika.BasicProperties(delivery_mode=2),
    )
    connection.close()


@pytest.fixture
def pending_analysis_job(c_major_120bpm_wav):
    # Real Track + AnalysisJob rows, and the fixture audio uploaded to the
    # real local MinIO bucket under Track.audio_file_key — end to end,
    # same tables/bucket the rest of the app reads and writes.
    track_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())
    audio_key = f"{uuid.uuid4()}.wav"

    minio_client = Minio(
        f"{os.environ['MINIO_ENDPOINT']}:{os.environ['MINIO_PORT']}",
        access_key=os.environ["MINIO_ROOT_USER"],
        secret_key=os.environ["MINIO_ROOT_PASSWORD"],
        secure=False,
    )
    bucket = os.environ["MINIO_BUCKET"]
    if not minio_client.bucket_exists(bucket):
        minio_client.make_bucket(bucket)
    minio_client.fput_object(bucket, audio_key, c_major_120bpm_wav)

    connection = psycopg2.connect(os.environ["DATABASE_URL"])
    with connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                INSERT INTO tracks (id, title, source_type, status, audio_file_key)
                VALUES (%s, 'Test track', 'UPLOAD', 'PENDING', %s)
                """,
                (track_id, audio_key),
            )
            cur.execute(
                "INSERT INTO analysis_jobs (id, track_id, status) VALUES (%s, %s, 'PENDING')",
                (job_id, track_id),
            )

    yield track_id, job_id

    with connection:
        with connection.cursor() as cur:
            cur.execute("DELETE FROM analysis_jobs WHERE id = %s", (job_id,))
            cur.execute("DELETE FROM chord_segments WHERE track_id = %s", (track_id,))
            cur.execute("DELETE FROM tracks WHERE id = %s", (track_id,))
    connection.close()
    minio_client.remove_object(bucket, audio_key)


@pytest.fixture
def job_with_missing_audio():
    # Real Track + AnalysisJob rows, but audio_file_key points to an
    # object never uploaded to MinIO — exercises the failure path
    # (download_audio raising) end to end, distinct from the unknown-track
    # case below (no Track/AnalysisJob rows at all).
    track_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())
    audio_key = f"{uuid.uuid4()}.wav"

    connection = psycopg2.connect(os.environ["DATABASE_URL"])
    with connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                INSERT INTO tracks (id, title, source_type, status, audio_file_key)
                VALUES (%s, 'Test track', 'UPLOAD', 'PENDING', %s)
                """,
                (track_id, audio_key),
            )
            cur.execute(
                "INSERT INTO analysis_jobs (id, track_id, status) VALUES (%s, %s, 'PENDING')",
                (job_id, track_id),
            )

    yield track_id, job_id

    with connection:
        with connection.cursor() as cur:
            cur.execute("DELETE FROM analysis_jobs WHERE id = %s", (job_id,))
            cur.execute("DELETE FROM chord_segments WHERE track_id = %s", (track_id,))
            cur.execute("DELETE FROM tracks WHERE id = %s", (track_id,))
    connection.close()


def _wait_for_job_done(job_id: str, timeout_s: float = 20.0) -> str:
    connection = psycopg2.connect(os.environ["DATABASE_URL"])
    deadline = time.time() + timeout_s
    try:
        while time.time() < deadline:
            with connection, connection.cursor() as cur:
                cur.execute("SELECT status FROM analysis_jobs WHERE id = %s", (job_id,))
                (status,) = cur.fetchone()
            if status != "PENDING":
                return status
            time.sleep(0.5)
        return status
    finally:
        connection.close()


def test_worker_consumes_a_job_writes_chord_segments_and_marks_it_done(
    pending_analysis_job,
):
    # Same shared-queue caveat as below — requires no other consumer on
    # the real analysis_jobs queue (e.g. a dev `uvicorn --reload` instance).
    track_id, job_id = pending_analysis_job
    _publish({"trackId": track_id, "jobId": job_id})

    with TestClient(app):
        job_status = _wait_for_job_done(job_id)

    assert job_status == "DONE"

    connection = psycopg2.connect(os.environ["DATABASE_URL"])
    with connection, connection.cursor() as cur:
        cur.execute(
            "SELECT status, tempo_bpm, key_root, key_scale FROM tracks WHERE id = %s",
            (track_id,),
        )
        track_status, tempo_bpm, key_root, key_scale = cur.fetchone()
        cur.execute("SELECT count(*) FROM chord_segments WHERE track_id = %s", (track_id,))
        (segment_count,) = cur.fetchone()
    connection.close()

    assert track_status == "READY"
    assert segment_count >= 1
    assert tempo_bpm is not None
    assert key_root is not None
    assert key_scale in ("major", "minor")


def test_worker_logs_and_rejects_a_malformed_message(capfd):
    # Same shared-queue caveat as the test above.
    connection = pika.BlockingConnection(pika.URLParameters(os.environ["RABBITMQ_URL"]))
    channel = connection.channel()
    channel.queue_declare(queue=ANALYSIS_JOBS_QUEUE, durable=True)
    channel.basic_publish(
        exchange="",
        routing_key=ANALYSIS_JOBS_QUEUE,
        body=b"not-json",
        properties=pika.BasicProperties(delivery_mode=2),
    )
    connection.close()

    with TestClient(app):
        time.sleep(2)

    captured = capfd.readouterr()
    assert "Failed to process message" in captured.out


def test_worker_logs_and_rejects_a_job_for_an_unknown_track(capfd):
    # Same shared-queue caveat as the tests above. No Track/AnalysisJob
    # rows exist for these ids, so there's nothing in the DB to mark
    # failed — just the log line.
    _publish({"trackId": str(uuid.uuid4()), "jobId": str(uuid.uuid4())})

    with TestClient(app):
        time.sleep(2)

    captured = capfd.readouterr()
    assert "Failed to process message" in captured.out
    assert "unknown track" in captured.out


def test_worker_marks_the_job_and_track_error_when_analysis_fails(job_with_missing_audio):
    # Same shared-queue caveat as the tests above.
    track_id, job_id = job_with_missing_audio
    _publish({"trackId": track_id, "jobId": job_id})

    with TestClient(app):
        job_status = _wait_for_job_done(job_id)

    assert job_status == "ERROR"

    connection = psycopg2.connect(os.environ["DATABASE_URL"])
    with connection, connection.cursor() as cur:
        cur.execute("SELECT error_message FROM analysis_jobs WHERE id = %s", (job_id,))
        (error_message,) = cur.fetchone()
        cur.execute("SELECT status FROM tracks WHERE id = %s", (track_id,))
        (track_status,) = cur.fetchone()
    connection.close()

    assert error_message
    assert track_status == "ERROR"
