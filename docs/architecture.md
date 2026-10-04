# System Architecture

## Overview
The **Smart Driver IoT** system is an end-to-end IoT platform designed to evaluate real-time driving safety, detect risky maneuvers, and classify driver behavior using machine learning.

```
┌─────────────────────────┐
│     ESP32 + Sensors     │  (or Python IoT Sensor Simulator)
│  • MPU6050 (Accel/Gyro) │
│  • NEO-6M GPS Module    │
└────────────┬────────────┘
             │ HTTP POST /api/sensor-data
             ▼
┌─────────────────────────┐
│     FastAPI Backend     │
│  • Pydantic Ingestion   │
│  • Event Detection      │
│  • Safety Score Engine  │
│  • ML Random Forest     │
└────────────┬────────────┘
             │ Storage Abstraction
             ▼
┌─────────────────────────┐
│     Database Layer      │
│  • MongoDB (Primary)    │
│  • SQLite (Fallback)    │
└────────────┬────────────┘
             │ REST Polling
             ▼
┌─────────────────────────┐
│     React Dashboard     │
│  • Live Telemetry & Map │
│  • Trip Explorer        │
│  • Filterable Events    │
│  • ML Analytics         │
└─────────────────────────┘
```

## Data Pipeline Stages
1. **Sensor Acquisition / Simulation:** 1-second telemetry packets (Speed, Accel X/Y/Z, Gyro X/Y/Z, Lat, Lon) transmitted via HTTP POST.
2. **Validation & Storage:** FastAPI validates fields with Pydantic and stores them into the database (MongoDB or local SQLite development storage).
3. **Rule-Based Event Detection:** Real-time checking against configurable kinematic thresholds:
   - `OVERSPEED`: Speed > 60 km/h
   - `HARSH_BRAKING`: Forward Accel < -4.0 m/s²
   - `SUDDEN_ACCELERATION`: Forward Accel > 4.0 m/s²
   - `SHARP_TURN`: Yaw Gyro > 3.0 rad/s
   - `ABNORMAL_BEHAVIOR`: Combined high speed and erratic maneuvers
4. **Safety Score Calculation:** Base 100 with deduction penalties:
   - Overspeed: -2 (LOW), -5 (MED), -10 (HIGH)
   - Harsh Braking: -2 (LOW), -5 (MED), -8 (HIGH)
   - Sudden Accel: -2 (LOW), -4 (MED), -7 (HIGH)
   - Sharp Turn: -2 (LOW), -4 (MED), -6 (HIGH)
   - Classification: 80–100 (SAFE), 60–79 (MODERATE), 0–59 (RISKY).
5. **Machine Learning Pipeline:** Random Forest Classifier trained on 10 aggregated motion and event features.
6. **Frontend Presentation:** Real-time polling updates the React dashboard, telemetry meters, and OpenStreetMap vehicle trail.
