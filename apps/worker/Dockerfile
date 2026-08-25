# Single stage: no monorepo pruning needed, the worker has its own
# requirements.txt, not part of the pnpm workspace.
FROM python:3.12-slim AS base

WORKDIR /app

# ffmpeg: yt-dlp (TON-021) re-encodes downloaded YouTube audio to wav
# through it — Essentia's MonoLoader can't decode the raw webm/opus
# container yt-dlp downloads directly (verified: "Unsupported codec!").
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# essentia ships manylinux wheels for cp312 — no system build deps
# (gcc, libfftw3, etc.) needed, verified directly against this base image

COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
