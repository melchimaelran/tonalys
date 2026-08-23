# Single stage: no monorepo pruning needed, the worker has its own
# requirements.txt, not part of the pnpm workspace.
FROM python:3.12-slim AS base

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# essentia ships manylinux wheels for cp312 — no system build deps
# (gcc, libfftw3, etc.) needed, verified directly against this base image

COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
