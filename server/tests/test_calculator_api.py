from __future__ import annotations

from math import isclose

from fastapi.testclient import TestClient

from app.main import app
from app.photo_math import GrokPhotoMathService
from app.schemas import PhotoMathAnalysis

client = TestClient(app)


def test_healthcheck() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_degree_mode_trigonometry() -> None:
    response = client.post(
        "/api/v1/calculate",
        json={"expression": "sin(90) + cos(0)", "angle_mode": "degree", "precision": 12},
    )

    assert response.status_code == 200
    payload = response.json()
    assert isclose(payload["result"], 2.0, rel_tol=1e-9)
    assert payload["formatted_result"] == "2"


def test_expression_with_constants_and_power() -> None:
    response = client.post(
        "/api/v1/calculate",
        json={"expression": "cos(pi) + sqrt(81) + 2^5", "angle_mode": "radian"},
    )

    assert response.status_code == 200
    assert response.json()["result"] == 40


def test_factorial_and_logarithm() -> None:
    response = client.post(
        "/api/v1/calculate",
        json={"expression": "fact(5) + log(100) + ln(e)", "angle_mode": "radian"},
    )

    assert response.status_code == 200
    assert response.json()["result"] == 123


def test_invalid_expression_returns_error() -> None:
    response = client.post(
        "/api/v1/calculate",
        json={"expression": "tan(90)", "angle_mode": "degree"},
    )

    assert response.status_code == 400
    assert "undefined" in response.json()["detail"]


def test_photo_math_upload_returns_structured_result(monkeypatch) -> None:
    async def fake_solve_image(self, image_bytes: bytes, media_type: str):
        assert image_bytes == b"fake-image"
        assert media_type == "image/png"
        return PhotoMathAnalysis(
            can_solve=True,
            detected_problem="12 + 8",
            answer="20",
            steps=["12 va 8 ni qo'shing.", "Natija 20 bo'ladi."],
            confidence_note="Image was clear.",
        )

    monkeypatch.setattr(GrokPhotoMathService, "solve_image", fake_solve_image)

    response = client.post(
        "/api/v1/photo-math",
        files={"image": ("math.png", b"fake-image", "image/png")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["answer"] == "20"
    assert payload["detected_problem"] == "12 + 8"
    assert payload["filename"] == "math.png"


def test_photo_math_validation_error() -> None:
    response = client.post(
        "/api/v1/photo-math",
        files={"image": ("math.gif", b"fake-image", "image/gif")},
    )

    assert response.status_code == 400
    assert "JPG and PNG" in response.json()["detail"]
