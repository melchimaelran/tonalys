from fastapi.testclient import TestClient

from app.main import app
from tests.test_youtube import NONEXISTENT_VIDEO_URL, TEST_VIDEO_URL


def test_youtube_info_returns_title_and_duration_for_a_valid_video():
    with TestClient(app) as client:
        response = client.get("/youtube/info", params={"url": TEST_VIDEO_URL})

    assert response.status_code == 200
    body = response.json()
    assert body["available"] is True
    assert body["title"]
    assert 15 <= body["duration_seconds"] <= 25


def test_youtube_info_returns_unavailable_for_a_nonexistent_video():
    with TestClient(app) as client:
        response = client.get("/youtube/info", params={"url": NONEXISTENT_VIDEO_URL})

    assert response.status_code == 200
    assert response.json() == {"available": False, "title": None, "duration_seconds": None}
