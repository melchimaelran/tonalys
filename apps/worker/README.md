# tonalys-worker

The audio-analysis service — Python + FastAPI. Consumes `analysis_jobs` from
RabbitMQ; for each job it pulls the audio from MinIO, runs **tempo + key
detection ([madmom](https://github.com/CPJKU/madmom))** and **chord
recognition (chord-cnn-lstm**, vendored under `vendor/chord_cnn_lstm/`, see
`project/tonalys-adr.md` ADR-052)**, and writes the results + status straight
to Postgres. Also exposes `GET /youtube/info` (yt-dlp) for the Nest API's
link validation. CPU-only.

See the [root README](../../README.md) for the full picture. Copy
`.env.example` to `.env` for native dev.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install --index-url https://download.pytorch.org/whl/cpu torch
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

python -m pytest tests/ -v
```
