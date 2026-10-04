# Testing Guide

## 1. Automated Backend Tests
Run the complete automated test suite covering health checks, sensor data validation, event triggers, safety scoring, ML inference, and database fallback:

```bash
# From workspace root:
.\venv\Scripts\python.exe -m pytest backend/test_api.py -v
```

## 2. End-to-End Workflow Verification

1. **Verify Backend Health:**
   ```bash
   curl http://localhost:8000/api/health
   ```
   Expected response:
   ```json
   {"status":"ok","service":"smart-driver-iot-backend","database":"development-mode",...}
   ```

2. **Stream Safe Driving Telemetry:**
   ```bash
   .\venv\Scripts\python.exe iot_simulator/sensor_simulator.py --scenario safe --duration 10
   ```

3. **Stream Risky Driving Telemetry (Triggers Events):**
   ```bash
   .\venv\Scripts\python.exe iot_simulator/sensor_simulator.py --scenario risky --duration 15
   ```

4. **Verify Live Dashboard Telemetry:**
   ```bash
   curl http://localhost:8000/api/dashboard/live
   ```

5. **Verify Detected Events:**
   ```bash
   curl http://localhost:8000/api/events
   ```
