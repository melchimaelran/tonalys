import json
import os
import tempfile
from contextlib import asynccontextmanager
from typing import AsyncIterator

import aio_pika
from dotenv import load_dotenv
from fastapi import FastAPI

from app.analysis import extract_chords, extract_key, extract_tempo, load_audio
from app.db import (
    get_audio_file_key,
    mark_analysis_complete,
    mark_analysis_failed,
    mark_analysis_processing,
    save_chord_segments,
    save_tempo_and_key,
)
from app.storage import download_audio
from app.youtube import get_video_info

load_dotenv()

ANALYSIS_JOBS_QUEUE = "analysis_jobs"


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

            mark_analysis_processing(track_id, job_id)

            audio_key = get_audio_file_key(track_id)
            if audio_key is None:
                raise ValueError(f"unknown track {track_id}")

            with tempfile.TemporaryDirectory() as tmp_dir:
                audio_path = download_audio(audio_key, tmp_dir)
                tempo = extract_tempo(audio_path)
                key, scale = extract_key(audio_path)
                audio = load_audio(audio_path)
                segments = extract_chords(audio)

            save_chord_segments(track_id, segments)
            save_tempo_and_key(track_id, tempo, key, scale)
            mark_analysis_complete(track_id, job_id)
        except Exception as error:
            print(f"Failed to process message: {error}", flush=True)
            if job_id is not None:
                mark_analysis_failed(track_id, job_id, str(error))


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    connection = await aio_pika.connect_robust(os.environ["RABBITMQ_URL"])

    try:
        channel = await connection.channel()
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
