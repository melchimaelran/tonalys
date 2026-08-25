import os
import uuid

import psycopg2
import pytest

from app.analysis import ChordSegment
from app.db import (
    get_audio_file_key,
    mark_analysis_complete,
    mark_analysis_failed,
    mark_analysis_processing,
    save_chord_segments,
)


@pytest.fixture
def track_and_job():
    """A real Track + AnalysisJob row pair, inserted directly (no Prisma
    client on the Python side — the worker talks to the same Postgres
    tables Prisma manages, by name/column, since it never owns migrations
    itself). Cleaned up after the test regardless of outcome."""
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

    yield track_id, job_id, audio_key

    with connection:
        with connection.cursor() as cur:
            cur.execute("DELETE FROM analysis_jobs WHERE id = %s", (job_id,))
            cur.execute("DELETE FROM chord_segments WHERE track_id = %s", (track_id,))
            cur.execute("DELETE FROM tracks WHERE id = %s", (track_id,))
    connection.close()


def test_get_audio_file_key_returns_the_stored_key(track_and_job):
    track_id, _job_id, audio_key = track_and_job

    assert get_audio_file_key(track_id) == audio_key


def test_get_audio_file_key_returns_none_for_an_unknown_track():
    assert get_audio_file_key(str(uuid.uuid4())) is None


def test_save_chord_segments_inserts_a_row_per_segment(track_and_job):
    track_id, _job_id, _audio_key = track_and_job
    segments = [
        ChordSegment(start_time=0.0, end_time=1.0, root="C", chord_type="major"),
        ChordSegment(start_time=1.0, end_time=2.0, root="A", chord_type="minor"),
    ]

    save_chord_segments(track_id, segments)

    connection = psycopg2.connect(os.environ["DATABASE_URL"])
    with connection, connection.cursor() as cur:
        cur.execute(
            "SELECT root, chord_type, start_time, end_time FROM chord_segments "
            "WHERE track_id = %s ORDER BY start_time",
            (track_id,),
        )
        rows = cur.fetchall()
    connection.close()

    assert rows == [("C", "major", 0.0, 1.0), ("A", "minor", 1.0, 2.0)]


def test_mark_analysis_processing_marks_job_and_track_processing(track_and_job):
    track_id, job_id, _audio_key = track_and_job

    mark_analysis_processing(track_id, job_id)

    connection = psycopg2.connect(os.environ["DATABASE_URL"])
    with connection, connection.cursor() as cur:
        cur.execute("SELECT status FROM analysis_jobs WHERE id = %s", (job_id,))
        (job_status,) = cur.fetchone()
        cur.execute("SELECT status FROM tracks WHERE id = %s", (track_id,))
        (track_status,) = cur.fetchone()
    connection.close()

    assert job_status == "PROCESSING"
    assert track_status == "PROCESSING"


def test_mark_analysis_complete_marks_job_done_and_track_ready(track_and_job):
    track_id, job_id, _audio_key = track_and_job

    mark_analysis_complete(track_id, job_id)

    connection = psycopg2.connect(os.environ["DATABASE_URL"])
    with connection, connection.cursor() as cur:
        cur.execute("SELECT status, completed_at FROM analysis_jobs WHERE id = %s", (job_id,))
        job_status, completed_at = cur.fetchone()
        cur.execute("SELECT status FROM tracks WHERE id = %s", (track_id,))
        (track_status,) = cur.fetchone()
    connection.close()

    assert job_status == "DONE"
    assert completed_at is not None
    assert track_status == "READY"


def test_mark_analysis_failed_marks_job_error_with_message(track_and_job):
    track_id, job_id, _audio_key = track_and_job

    mark_analysis_failed(track_id, job_id, "MinIO object not found")

    connection = psycopg2.connect(os.environ["DATABASE_URL"])
    with connection, connection.cursor() as cur:
        cur.execute(
            "SELECT status, error_message, completed_at FROM analysis_jobs WHERE id = %s",
            (job_id,),
        )
        job_status, error_message, completed_at = cur.fetchone()
        cur.execute("SELECT status FROM tracks WHERE id = %s", (track_id,))
        (track_status,) = cur.fetchone()
    connection.close()

    assert job_status == "ERROR"
    assert error_message == "MinIO object not found"
    assert completed_at is not None
    assert track_status == "ERROR"


def test_mark_analysis_failed_with_no_track_id_still_marks_the_job(track_and_job):
    _track_id, job_id, _audio_key = track_and_job

    mark_analysis_failed(None, job_id, "payload missing trackId/jobId")

    connection = psycopg2.connect(os.environ["DATABASE_URL"])
    with connection, connection.cursor() as cur:
        cur.execute("SELECT status, error_message FROM analysis_jobs WHERE id = %s", (job_id,))
        job_status, error_message = cur.fetchone()
    connection.close()

    assert job_status == "ERROR"
    assert error_message == "payload missing trackId/jobId"
