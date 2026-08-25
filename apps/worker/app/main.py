import json
import os
import tempfile
from contextlib import asynccontextmanager
from typing import AsyncIterator

import aio_pika
from dotenv import load_dotenv
from fastapi import FastAPI

from app.analysis import extract_chords, load_audio
from app.db import get_audio_file_key, mark_analysis_complete, save_chord_segments
from app.storage import download_audio

load_dotenv()

ANALYSIS_JOBS_QUEUE = "analysis_jobs"


async def handle_message(message: aio_pika.abc.AbstractIncomingMessage) -> None:
    async with message.process():
        try:
            payload = json.loads(message.body)
        except json.JSONDecodeError as error:
            print(f"Failed to process message: {error}", flush=True)
            raise

        track_id = payload["trackId"]
        job_id = payload["jobId"]

        audio_key = get_audio_file_key(track_id)
        with tempfile.TemporaryDirectory() as tmp_dir:
            audio_path = download_audio(audio_key, tmp_dir)
            audio = load_audio(audio_path)
            segments = extract_chords(audio)

        save_chord_segments(track_id, segments)
        mark_analysis_complete(track_id, job_id)


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
