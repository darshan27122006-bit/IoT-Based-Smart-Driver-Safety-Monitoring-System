from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "smart-driver-iot-backend"
    assert data["database"] in ["connected", "development-mode"]
    assert "timestamp" in data

def test_ml_metrics_format():
    response = client.get("/api/ml/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "accuracy" in data or "error" in data
