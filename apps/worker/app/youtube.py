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
        return os.path.splitext(original_path)[0] + ".wav"
