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
        payload = json.loads(message.body)
        # Real analysis (Essentia) lands in a later ticket — this just proves
        # the plumbing end to end for now.
        print(f"Received analysis job: {payload}", flush=True)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    connection = await aio_pika.connect_robust(os.environ["RABBITMQ_URL"])
    channel = await connection.channel()
    queue = await channel.declare_queue(ANALYSIS_JOBS_QUEUE, durable=True)
    await queue.consume(handle_message)

    yield

    await connection.close()


app = FastAPI(title="Tonalys worker", lifespan=lifespan)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "tonalys-worker"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
