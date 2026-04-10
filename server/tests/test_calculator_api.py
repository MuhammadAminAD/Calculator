from __future__ import annotations

from math import isclose

from fastapi.testclient import TestClient

from app.main import app

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
