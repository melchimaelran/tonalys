import json
import os
import tempfile
from contextlib import asynccontextmanager
from typing import AsyncIterator

import aio_pika
from dotenv import load_dotenv
from fastapi import FastAPI

from app.analysis import extract_chords, extract_key, extract_tempo
from app.db import (
    get_track_source,
    mark_analysis_complete,
    mark_analysis_failed,
    mark_analysis_processing,
    save_chord_segments,
    save_tempo_and_key,
    set_audio_file_key,
    track_exists,
)
from app.storage import download_audio, upload_audio
from app.youtube import YoutubeDownloadError
from app.youtube import download_audio as download_youtube_audio
from app.youtube import get_video_info

load_dotenv()

ANALYSIS_JOBS_QUEUE = "analysis_jobs"


class JobCancelled(Exception):
    """The track was deleted while the job was queued or mid-analysis.

    Raised so the message is acked and dropped without recording an ERROR —
    the job/track rows are already gone (the user closed the page).
    """


def _raise_if_cancelled(track_id: str) -> None:
    if not track_exists(track_id):
        raise JobCancelled()


def _obtain_audio(track_id: str, dest_dir: str) -> str:
    """Return a local path to the track's audio, fetching it if needed.

    Upload tracks already have their audio in MinIO under audio_file_key.
    YouTube tracks arrive with only source_url — download it with yt-dlp,
    push the wav to MinIO and record the key so playback (and any re-run)
    can reuse it, matching how upload tracks are stored."""
    audio_file_key, source_url = get_track_source(track_id)

    if audio_file_key:
        return download_audio(audio_file_key, dest_dir)

    if source_url:
        wav_path = download_youtube_audio(source_url, dest_dir)
        key = f"{track_id}.wav"
        upload_audio(wav_path, key)
        set_audio_file_key(track_id, key)
        return wav_path

    raise ValueError(f"track {track_id} has no audio source")


async def handle_message(message: aio_pika.abc.AbstractIncomingMessage) -> None:
    async with message.process():
        try:
            payload = json.loads(message.body)
        except json.JSONDecodeError as error:
            print(f"Failed to process message: {error}", flush=True)
            raise

        track_id = payload.get("trackId")
        job_id = payload.get("jobId")

        # Any failure past this point is an analysis failure, not a queue
        # problem — caught and recorded on the job/track rather than left
        # to nack (RabbitMQ would otherwise requeue and retry the same
        # message forever). No job_id means there's nothing to mark, so
        # that case is logged only.
        try:
            if track_id is None or job_id is None:
                raise ValueError("payload missing trackId/jobId")

            # The user can cancel by closing the page — the API hard-deletes
            # the track. Check before starting and again between each analysis
            # phase (the cheapest cancellation granularity without killing a
            # running phase mid-flight).
            _raise_if_cancelled(track_id)

            mark_analysis_processing(track_id, job_id)

            with tempfile.TemporaryDirectory() as tmp_dir:
                audio_path = _obtain_audio(track_id, tmp_dir)
                tempo = extract_tempo(audio_path)
                _raise_if_cancelled(track_id)
                key, scale = extract_key(audio_path)
                _raise_if_cancelled(track_id)
                segments = extract_chords(audio_path)

            _raise_if_cancelled(track_id)
            save_chord_segments(track_id, segments)
            save_tempo_and_key(track_id, tempo, key, scale)
            mark_analysis_complete(track_id, job_id)
        except JobCancelled:
            print(f"Job cancelled, skipping track {track_id}", flush=True)
        except YoutubeDownloadError as error:
            # Store the user-facing wording, not yt-dlp's raw dump.
            print(f"YouTube download failed ({error.reason}): {error}", flush=True)
            if job_id is not None:
                mark_analysis_failed(track_id, job_id, error.user_message)
        except Exception as error:
            print(f"Failed to process message: {error}", flush=True)
            if job_id is not None:
                mark_analysis_failed(track_id, job_id, str(error))


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    connection = await aio_pika.connect_robust(os.environ["RABBITMQ_URL"])

    try:
        channel = await connection.channel()
        # One analysis at a time: RabbitMQ won't deliver the next job until
        # the current message is acked (message.process() acks on success),
        # so extra submissions wait in the queue instead of thrashing CPU.
        await channel.set_qos(prefetch_count=1)
        queue = await channel.declare_queue(ANALYSIS_JOBS_QUEUE, durable=True)
        await queue.consume(handle_message)
    except Exception:
        await connection.close()
        raise

    yield

    await connection.close()


app = FastAPI(title="Tonalys worker", lifespan=lifespan)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "tonalys-worker"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/youtube/info")
def youtube_info(url: str) -> dict:
    return get_video_info(url)
