import pytest
from fastapi.testclient import TestClient
from main import app
from database import get_database

client = TestClient(app)

def setup_module(module):
    # Ensure database is initialized
    db = get_database()

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "smart-driver-iot-backend"
    assert data["database"] in ["connected", "development-mode"]
    assert "timestamp" in data

def test_sensor_data_ingestion_safe():
    payload = {
        "device_id": "ESP32-001",
        "driver_id": "DRV001",
        "trip_id": "TEST_TRIP_001",
        "timestamp": "2026-10-04T12:00:00Z",
        "speed_kmh": 45.0,
        "acceleration_x": 0.5,
        "acceleration_y": 0.2,
        "acceleration_z": 9.8,
        "gyroscope_x": 0.05,
        "gyroscope_y": 0.02,
        "gyroscope_z": 0.1,
        "latitude": 13.0827,
        "longitude": 80.2707
    }
    response = client.post("/api/sensor-data", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["message"] == "Sensor data received"
    assert res_data["safety_score"] == 100.0

def test_sensor_data_validation_error():
    # Missing speed_kmh and accelerations
    payload = {
        "device_id": "ESP32-001",
        "driver_id": "DRV001"
    }
    response = client.post("/api/sensor-data", json=payload)
    assert response.status_code == 422

def test_event_detection_and_score_deductions():
    # 1. Overspeed (speed > 60 km/h)
    overspeed_payload = {
        "device_id": "ESP32-001",
        "driver_id": "DRV001",
        "trip_id": "TEST_TRIP_002",
        "timestamp": "2026-10-04T12:05:00Z",
        "speed_kmh": 85.0, # > 60 + 20 => MEDIUM severity (-5 penalty)
        "acceleration_x": 0.5,
        "acceleration_y": 0.1,
        "acceleration_z": 9.8,
        "gyroscope_x": 0.01,
        "gyroscope_y": 0.01,
        "gyroscope_z": 0.05,
        "latitude": 13.0830,
        "longitude": 80.2710
    }
    res1 = client.post("/api/sensor-data", json=overspeed_payload)
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["event"] is not None
    assert d1["event"]["event_type"] == "OVERSPEED"
    assert d1["safety_score"] <= 95.0

    # 2. Harsh Braking (accel_x < -4.0 m/s^2)
    braking_payload = {
        "device_id": "ESP32-001",
        "driver_id": "DRV001",
        "trip_id": "TEST_TRIP_002",
        "timestamp": "2026-10-04T12:05:05Z",
        "speed_kmh": 50.0,
        "acceleration_x": -5.8,
        "acceleration_y": 0.1,
        "acceleration_z": 9.8,
        "gyroscope_x": 0.01,
        "gyroscope_y": 0.01,
        "gyroscope_z": 0.05,
        "latitude": 13.0835,
        "longitude": 80.2715
    }
    res2 = client.post("/api/sensor-data", json=braking_payload)
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["event"]["event_type"] == "HARSH_BRAKING"

    # 3. Sudden Acceleration (accel_x > 4.0 m/s^2)
    accel_payload = {
        "device_id": "ESP32-001",
        "driver_id": "DRV001",
        "trip_id": "TEST_TRIP_002",
        "timestamp": "2026-10-04T12:05:10Z",
        "speed_kmh": 55.0,
        "acceleration_x": 5.2,
        "acceleration_y": 0.1,
        "acceleration_z": 9.8,
        "gyroscope_x": 0.01,
        "gyroscope_y": 0.01,
        "gyroscope_z": 0.05,
        "latitude": 13.0840,
        "longitude": 80.2720
    }
    res3 = client.post("/api/sensor-data", json=accel_payload)
    assert res3.status_code == 200
    assert res3.json()["event"]["event_type"] == "SUDDEN_ACCELERATION"

    # 4. Sharp Turn (gyro_z > 3.0 rad/s)
    turn_payload = {
        "device_id": "ESP32-001",
        "driver_id": "DRV001",
        "trip_id": "TEST_TRIP_002",
        "timestamp": "2026-10-04T12:05:15Z",
        "speed_kmh": 40.0,
        "acceleration_x": 0.2,
        "acceleration_y": 4.2,
        "acceleration_z": 9.8,
        "gyroscope_x": 0.1,
        "gyroscope_y": 0.1,
        "gyroscope_z": 3.8,
        "latitude": 13.0845,
        "longitude": 80.2725
    }
    res4 = client.post("/api/sensor-data", json=turn_payload)
    assert res4.status_code == 200
    assert res4.json()["event"]["event_type"] in ["SHARP_TURN", "ABNORMAL_BEHAVIOR"]

def test_latest_sensor_data():
    response = client.get("/api/sensor-data/latest")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert data["data"] is not None
    assert "speed_kmh" in data["data"]

def test_dashboard_live():
    response = client.get("/api/dashboard/live")
    assert response.status_code == 200
    data = response.json()
    assert "speed" in data
    assert "acceleration" in data
    assert "gyroscope" in data
    assert "safety_score" in data
    assert "classification" in data
    assert "latitude" in data
    assert "longitude" in data

def test_dashboard_summary():
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_trips" in data
    assert "total_events" in data
    assert "events_breakdown" in data
    assert "recent_history" in data
    assert "classification_distribution" in data

def test_trips_and_trip_details():
    response = client.get("/api/trips")
    assert response.status_code == 200
    trips = response.json()
    assert isinstance(trips, list)
    assert len(trips) > 0
    trip_id = trips[0]["trip_id"]

    detail_res = client.get(f"/api/trips/{trip_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert "trip" in detail
    assert "sensors" in detail
    assert "events" in detail

def test_events_filtering():
    response = client.get("/api/events")
    assert response.status_code == 200
    events = response.json()
    assert isinstance(events, list)

    filtered_res = client.get("/api/events?event_type=OVERSPEED")
    assert filtered_res.status_code == 200
    filtered_events = filtered_res.json()
    for ev in filtered_events:
        assert ev["event_type"] == "OVERSPEED"

def test_ml_predict():
    payload = {
        "average_speed": 45.0,
        "maximum_speed": 55.0,
        "average_acceleration": 0.5,
        "maximum_acceleration": 1.8,
        "harsh_braking_count": 0,
        "sudden_acceleration_count": 0,
        "sharp_turn_count": 0,
        "overspeed_count": 0,
        "acceleration_variance": 0.8,
        "gyroscope_variance": 0.4
    }
    response = client.post("/api/ml/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "prediction" in data
    assert data["prediction"] in ["SAFE", "MODERATE", "RISKY"]
    assert "confidence" in data
    assert "probabilities" in data

def test_ml_metrics():
    response = client.get("/api/ml/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "accuracy" in data
    assert "precision" in data
    assert "recall" in data
    assert "f1_score" in data
    assert "confusion_matrix" in data
