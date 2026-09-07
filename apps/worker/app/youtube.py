import copy
import logging
import os

import yt_dlp

logger = logging.getLogger(__name__)

# Substrings yt-dlp puts in its error when the failure is transient / on
# YouTube's or our side rather than a property of the video itself
# (bot-check, rate-limit, a "reload" playability state). The API surfaces
# these as 503 "try again later" rather than 400 "unavailable".
_BLOCKED_MARKERS = (
    "not a bot",  # "Sign in to confirm you're not a bot" (straight or curly ')
    "http error 429",
    "too many requests",
    "page needs to be reloaded",
)

# From a datacenter IP, YouTube's default (web) player response now
# demands a PO token, and yt-dlp then fails with "The page needs to be
# reloaded" / "no formats". `tv` and `web_safari` don't need one; keeping
# `default` first lets a working web response win when there is one.
# `missing_pot` still lists PO-token-gated formats as a last resort.
_YOUTUBE_EXTRACTOR_ARGS = {
    "player_client": ["default", "tv", "web_safari"],
    "formats": ["missing_pot"],
}


def classify_extraction_error(exc: Exception) -> str:
    """"blocked" (YouTube is refusing our IP/session — transient, our
    side) or "unavailable" (the video is private/removed/invalid)."""
    message = str(exc).lower()
    if any(marker in message for marker in _BLOCKED_MARKERS):
        return "blocked"
    return "unavailable"


def build_ydl_options(base: dict) -> dict:
    """Return a deep copy of `base` with the YouTube workarounds applied:
    `cookiefile` when `YT_COOKIES_FILE` points at an existing file, plus
    the `player_client` / `formats` extractor args (merged under any the
    caller already set).

    Prod runs from a datacenter IP that YouTube greets with "Sign in to
    confirm you're not a bot" then, once past that, "The page needs to be
    reloaded" on the web player (PO token) — see docs/deployment.md. A
    cookies.txt from a logged-in throwaway account plus the `tv` /
    `web_safari` clients clear both. Dev (residential IP) leaves
    `YT_COOKIES_FILE` unset; a missing/empty path is ignored rather than
    passed to yt-dlp (which would raise on a nonexistent cookie file)."""
    options = copy.deepcopy(base)

    cookie_file = os.environ.get("YT_COOKIES_FILE")
    if cookie_file and os.path.isfile(cookie_file):
        options["cookiefile"] = cookie_file
    elif cookie_file:
        logger.warning("YT_COOKIES_FILE set to %s but no such file; ignoring", cookie_file)

    extractor_args = options.setdefault("extractor_args", {})
    extractor_args["youtube"] = {
        **_YOUTUBE_EXTRACTOR_ARGS,
        **extractor_args.get("youtube", {}),
    }
    return options


def download_audio(url: str, destination_dir: str) -> str:
    # bestaudio: YouTube serves audio as its own separate stream (no video
    # track to discard), so no video/audio merge is needed. The raw
    # container yt-dlp picks (typically webm/opus) isn't decodable by
    # Essentia's MonoLoader ("Unsupported codec!", verified directly) —
    # FFmpegExtractAudio re-encodes to wav, the format already proven to
    # work through the rest of the analysis pipeline (TON-016/017).
    # Requires the ffmpeg binary on PATH (present in the worker Docker
    # image via apt, see Dockerfile).
    options = build_ydl_options(
        {
            "format": "bestaudio/best",
            "outtmpl": os.path.join(destination_dir, "%(id)s.%(ext)s"),
            "postprocessors": [
                {"key": "FFmpegExtractAudio", "preferredcodec": "wav"},
            ],
            "noplaylist": True,
            "quiet": True,
            "no_warnings": True,
        }
    )
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
    bot-check, ...) is reported as unavailable rather than raised — the
    caller only needs a yes/no plus the numbers, not the specific yt-dlp
    error. `reason` ("blocked" | "unavailable") lets Nest tell a real
    "private" apart from an IP/bot-check block; the full error is logged."""
    options = build_ydl_options({"quiet": True, "no_warnings": True, "noplaylist": True})
    try:
        with yt_dlp.YoutubeDL(options) as extractor:
            info = extractor.extract_info(url, download=False)
    except Exception as exc:
        logger.exception("yt-dlp metadata lookup failed for %s", url)
        return {
            "available": False,
            "title": None,
            "duration_seconds": None,
            "reason": classify_extraction_error(exc),
        }

    return {
        "available": True,
        "title": info.get("title"),
        "duration_seconds": info.get("duration"),
        "reason": None,
    }
