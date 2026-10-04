# API Documentation

Base URL: `http://localhost:8000` (or `http://<SERVER_IP>:8000`)
Interactive Documentation: `http://localhost:8000/docs`

---

### 1. Health Check
* **Endpoint:** `GET /api/health`
* **Response:**
```json
{
  "status": "ok",
  "service": "smart-driver-iot-backend",
  "database": "connected" or "development-mode",
  "timestamp": "2026-10-04T15:20:00.000Z"
}
```

---

### 2. Ingest Sensor Data
* **Endpoint:** `POST /api/sensor-data`
* **Payload:**
```json
{
  "device_id": "ESP32-001",
  "driver_id": "DRV001",
  "trip_id": "TRIP001",
  "timestamp": "2026-10-04T15:20:00.000Z",
  "speed_kmh": 45.5,
  "acceleration_x": 0.42,
  "acceleration_y": 0.18,
  "acceleration_z": 9.71,
  "gyroscope_x": 0.12,
  "gyroscope_y": 0.08,
  "gyroscope_z": 0.21,
  "latitude": 13.0827,
  "longitude": 80.2707
}
```
* **Response:**
```json
{
  "success": true,
  "message": "Sensor data received",
  "event": null,
  "safety_score": 92.0
}
```

---

### 3. Latest Sensor Reading
* **Endpoint:** `GET /api/sensor-data/latest`
* **Response:** Latest raw sensor dictionary or `{"data": null, "message": "No sensor data available"}`.

---

### 4. Live Telemetry
* **Endpoint:** `GET /api/dashboard/live`
* **Response:**
```json
{
  "has_data": true,
  "speed": 45.5,
  "acceleration": { "x": 0.42, "y": 0.18, "z": 9.71 },
  "gyroscope": { "x": 0.12, "y": 0.08, "z": 0.21 },
  "latitude": 13.0827,
  "longitude": 80.2707,
  "safety_score": 92.0,
  "classification": "SAFE",
  "latest_event": null,
  "timestamp": "2026-10-04T15:20:00.000Z"
}
```

---

### 5. Dashboard Summary
* **Endpoint:** `GET /api/dashboard/summary`
* **Response:** Total trips, total events, events breakdown by type, recent history points, and classification distribution.

---

### 6. Trips List & Details
* **List:** `GET /api/trips?limit=20`
* **Details:** `GET /api/trips/{trip_id}`

---

### 7. Filterable Events
* **Endpoint:** `GET /api/events?event_type=...&severity=...&driver_id=...&trip_id=...&limit=50`

---

### 8. Machine Learning
* **Metrics:** `GET /api/ml/metrics`
* **Predict:** `POST /api/ml/predict`
  * **Payload:** 10 features dictionary
  * **Response:** Prediction ("SAFE", "MODERATE", "RISKY"), confidence, class probabilities.
