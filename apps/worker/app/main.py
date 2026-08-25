import json
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

import aio_pika
from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

ANALYSIS_JOBS_QUEUE = "analysis_jobs"


async def handle_message(message: aio_pika.abc.AbstractIncomingMessage) -> None:
    async with message.process():
        try:
            payload = json.loads(message.body)
        except json.JSONDecodeError as error:
            print(f"Failed to process message: {error}", flush=True)
            raise

        # Real analysis (Essentia) lands in a later ticket — this just proves
        # the plumbing end to end for now.
        print(f"Received analysis job: {payload}", flush=True)


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
