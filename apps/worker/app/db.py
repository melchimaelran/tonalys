import os
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Iterator

import psycopg2
from psycopg2.extensions import cursor as Cursor

from app.analysis import ChordSegment


@contextmanager
def _cursor() -> Iterator[Cursor]:
    connection = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        with connection:
            with connection.cursor() as cur:
                yield cur
    finally:
        connection.close()


def get_audio_file_key(track_id: str) -> str | None:
    with _cursor() as cur:
        cur.execute("SELECT audio_file_key FROM tracks WHERE id = %s", (track_id,))
        row = cur.fetchone()
        return row[0] if row else None


def save_chord_segments(track_id: str, segments: list[ChordSegment]) -> None:
    with _cursor() as cur:
        for segment in segments:
            cur.execute(
                """
                INSERT INTO chord_segments
                    (id, track_id, start_time, end_time, root, chord_type, bass_note, is_manual_edit)
                VALUES (%s, %s, %s, %s, %s, %s, %s, false)
                """,
                (
                    str(uuid.uuid4()),
                    track_id,
                    segment.start_time,
                    segment.end_time,
                    segment.root,
                    segment.chord_type,
                    segment.bass_note,
                ),
            )


def save_tempo_and_key(track_id: str, tempo_bpm: float, key: str, scale: str) -> None:
    with _cursor() as cur:
        cur.execute(
            "UPDATE tracks SET tempo_bpm = %s, key_root = %s, key_scale = %s WHERE id = %s",
            (tempo_bpm, key, scale, track_id),
        )


def mark_analysis_processing(track_id: str, job_id: str) -> None:
    with _cursor() as cur:
        cur.execute("UPDATE analysis_jobs SET status = 'PROCESSING' WHERE id = %s", (job_id,))
        cur.execute("UPDATE tracks SET status = 'PROCESSING' WHERE id = %s", (track_id,))


def mark_analysis_complete(track_id: str, job_id: str) -> None:
    with _cursor() as cur:
        cur.execute(
            "UPDATE analysis_jobs SET status = 'DONE', completed_at = %s WHERE id = %s",
            (datetime.now(timezone.utc), job_id),
        )
        cur.execute("UPDATE tracks SET status = 'READY' WHERE id = %s", (track_id,))


def mark_analysis_failed(track_id: str | None, job_id: str, error_message: str) -> None:
    with _cursor() as cur:
        cur.execute(
            """
            UPDATE analysis_jobs
            SET status = 'ERROR', error_message = %s, completed_at = %s
            WHERE id = %s
            """,
            (error_message, datetime.now(timezone.utc), job_id),
        )
        # track_id can be None (payload missing trackId) — nothing to
        # update in that case, and `WHERE id = NULL` would silently match
        # zero rows anyway, so skip it explicitly rather than issue a
        # no-op query.
        if track_id is not None:
            cur.execute("UPDATE tracks SET status = 'ERROR' WHERE id = %s", (track_id,))
