import os

import yt_dlp


def download_audio(url: str, destination_dir: str) -> str:
    # bestaudio: YouTube serves audio as its own separate stream (no video
    # track to discard), so no video/audio merge is needed. The raw
    # container yt-dlp picks (typically webm/opus) isn't decodable by
    # Essentia's MonoLoader ("Unsupported codec!", verified directly) —
    # FFmpegExtractAudio re-encodes to wav, the format already proven to
    # work through the rest of the analysis pipeline (TON-016/017).
    # Requires the ffmpeg binary on PATH (present in the worker Docker
    # image via apt, see Dockerfile).
    options = {
        "format": "bestaudio/best",
        "outtmpl": os.path.join(destination_dir, "%(id)s.%(ext)s"),
        "postprocessors": [
            {"key": "FFmpegExtractAudio", "preferredcodec": "wav"},
        ],
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
    }
    with yt_dlp.YoutubeDL(options) as downloader:
        info = downloader.extract_info(url, download=True)
        original_path = downloader.prepare_filename(info)
        wav_path = os.path.splitext(original_path)[0] + ".wav"

        if not os.path.exists(wav_path):
            raise RuntimeError(f"expected wav output at {wav_path} after extraction, found none")

        return wav_path


def get_video_info(url: str) -> dict:
    """Metadata lookup only (download=False) — used by Nest (TON-022) to
    validate a submitted link (duration, availability) before creating a
    Track/AnalysisJob. Any failure (invalid URL, private/deleted video,
    ...) is reported as unavailable rather than raised — the caller only
    needs a yes/no plus the numbers, not the specific yt-dlp error."""
    try:
        with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True, "noplaylist": True}) as extractor:
            info = extractor.extract_info(url, download=False)
    except Exception:
        return {"available": False, "title": None, "duration_seconds": None}

    return {
        "available": True,
        "title": info.get("title"),
        "duration_seconds": info.get("duration"),
    }
