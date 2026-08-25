import json
import os
import time

import pika
from fastapi.testclient import TestClient

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


def test_worker_consumes_a_published_analysis_job(capfd):
    # Requires no other consumer on the real analysis_jobs queue (e.g. a
    # dev `uvicorn --reload` instance) — RabbitMQ delivers each message to
    # exactly one consumer, so a competing one can silently steal it and
    # this test would flake instead of failing clearly.
    payload = {"trackId": "test-track", "jobId": "test-job"}
    _publish(payload)

    with TestClient(app):
        time.sleep(2)

    captured = capfd.readouterr()
    assert "test-track" in captured.out
    assert "test-job" in captured.out


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
