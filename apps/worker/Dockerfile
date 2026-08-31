# Multi-stage: madmom (git+Cython) and chord-cnn-lstm's torch dependency
# both need a C toolchain + git to install (ADR-052) — kept out of the
# runtime image, which only needs the resulting venv.
FROM python:3.12-slim AS builder

WORKDIR /app

# build-essential: Cython compilation for madmom (no PyPI release, no
# manylinux wheel — installs from source, ADR-052 step 1 spike).
# git: madmom installs via `pip install git+https://...`.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
# torch first, CPU-only index — the default PyPI wheel bundles CUDA and is
# much larger; `pip install -r requirements.txt` alone can't be trusted to
# prefer the CPU build (see the comment atop requirements.txt).
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim AS runtime

# ffmpeg: yt-dlp (TON-021) re-encodes downloaded YouTube audio to wav
# through it — the analysis engine can't decode the raw webm/opus
# container yt-dlp downloads directly.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY app/ ./app/
# chord-cnn-lstm (ADR-052) — vendored model code + the 5 checkpoints it
# ensembles at inference, apps/worker/vendor/chord_cnn_lstm/README.md.
COPY vendor/ ./vendor/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
