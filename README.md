# Smart Driver IoT

### IoT-Based Smart Driver Safety and Driving Behavior Monitoring System Using ESP32 and Machine Learning

An end-to-end IoT, embedded, and machine learning telemetry system that tracks vehicle dynamics, identifies risky driving events (overspeeding, harsh braking, sudden acceleration, sharp turns) in real-time, calculates driver safety scores, and classifies driving behavior using a Random Forest machine learning model.

---

## ⚡ Quick Demo (Run in One Command)

To immediately start the complete demonstrable prototype (Backend, Frontend Dashboard, and IoT Simulator):

```bash
# From the project root:
.\venv\Scripts\python.exe run_demo.py
```
*(Or specify `--risky` to trigger frequent events: `.\venv\Scripts\python.exe run_demo.py --risky`)*

Then open your browser at:
- **React Dashboard:** [http://localhost:5173](http://localhost:5173)
- **Live Telemetry & GPS:** [http://localhost:5173/live](http://localhost:5173/live)
- **Backend API & Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│        ESP32 + Sensors          │  ◄── (Or Python IoT Sensor Simulator)
│   • MPU6050 (Accel + Gyro)      │
│   • NEO-6M GPS Module           │
│   • Alert Buzzer & Status LED   │
└────────────────┬────────────────┘
                 │ Wi-Fi / HTTP POST
                 ▼
┌─────────────────────────────────┐
│     FastAPI Backend Service     │
│   • Sensor Ingestion API        │
│   • Rule-Based Event Detector   │
│   • Safety Score Engine         │
│   • Random Forest Classifier    │
└────────────────┬────────────────┘
                 │ Storage Abstraction Layer
                 ▼
┌─────────────────────────────────┐
│         Database Layer          │
│   • MongoDB (Primary)           │
│   • SQLite (Dev-Mode Fallback)  │
└────────────────┬────────────────┘
                 │ Polling / REST
                 ▼
┌─────────────────────────────────┐
│     React Dashboard (Vite)      │
│   • Live Telemetry & GPS Map    │
│   • Historical Trips Explorer   │
│   • Filterable Events Log       │
│   • ML Analytics & Confusion    │
└─────────────────────────────────┘
```

> **Important Distinction:**  
> This prototype supports a hardware-integrated architecture in which ESP32 collects sensor readings from MPU6050 and GPS modules and transmits them through Wi-Fi to the backend. A software simulator is also provided for development and demonstration when physical hardware is unavailable.

---

## 🔧 Hardware Subsystem

| Component | Specification | Connection to ESP32 | Function |
|---|---|---|---|
| **ESP32 DevKit** | 240MHz Dual Core, Wi-Fi | Master Controller | Telemetry acquisition & HTTP transmit |
| **MPU6050 IMU** | 6-DOF (Accel + Gyro) | SDA: GPIO 21, SCL: GPIO 22 | Measures 3D acceleration and angular velocity |
| **NEO-6M GPS** | UART (9600 Baud) | RX: GPIO 16 (RX2), TX: GPIO 17 (TX2) | Provides coordinates & GPS speed |
| **Active Buzzer**| 5V / 3.3V | GPIO 25 | In-cabin audible warning on safety events |
| **Warning LED**  | 5mm Red LED + 330Ω | GPIO 26 | Visual warning indicator |

See [docs/hardware.md](docs/hardware.md) for full wiring tables and schematic.

---

## 💻 Software Stack

- **Backend:** Python 3.12, FastAPI, Pydantic v2, Uvicorn, Motor (Async MongoDB), SQLite3 (Development fallback)
- **Frontend:** React 19, Vite, Tailwind CSS, React-Leaflet, OpenStreetMap, Recharts, Lucide Icons
- **Machine Learning:** Scikit-learn (Random Forest Classifier, 100 estimators), Pandas, NumPy, Joblib
- **Testing:** Pytest, FastApi TestClient

---

## 🚀 Manual Step-by-Step Setup

### 1. Backend Setup

```bash
# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt

# Start backend server
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Backend will be available at [http://localhost:8000](http://localhost:8000).

### 2. Frontend Setup

```bash
cd frontend

# Install npm dependencies (already configured)
npm install

# Start Vite dev server
npm run dev
```
Frontend will be available at [http://localhost:5173](http://localhost:5173).

### 3. Running the IoT Simulator

The simulator models vehicle kinematics along simulated Chennai corridors:

```bash
# Normal driving profile
.\venv\Scripts\python.exe iot_simulator/sensor_simulator.py --scenario normal

# Risky profile (triggers overspeed, harsh braking, sudden accel, sharp turns)
.\venv\Scripts\python.exe iot_simulator/sensor_simulator.py --scenario risky --interval 1.0

# Safe profile
.\venv\Scripts\python.exe iot_simulator/sensor_simulator.py --scenario safe
```

### 4. ESP32 Setup

1. Open `esp32/driver_monitor.ino` in Arduino IDE or PlatformIO.
2. Copy `esp32/config.example.h` to `esp32/config.h` and configure your local Wi-Fi SSID, Password, and your laptop's local LAN IP (e.g. `http://192.168.1.100:8000/api/sensor-data`).
3. Connect the MPU6050, GPS, and ESP32 according to [docs/hardware.md](docs/hardware.md).
4. Flash the code to the ESP32.

### 5. Retraining the ML Model

```bash
# Generates dataset and trains Random Forest Classifier
.\venv\Scripts\python.exe ml/generate_dataset.py
.\venv\Scripts\python.exe ml/train.py
.\venv\Scripts\python.exe ml/evaluate.py
```

### 6. Running Automated Tests

```bash
cd backend
..\venv\Scripts\python.exe -m pytest test_api.py -v
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health status and database mode (`connected` or `development-mode`) |
| `POST` | `/api/sensor-data` | Ingests sensor packet, triggers event detection and safety scoring |
| `GET` | `/api/sensor-data/latest` | Returns latest raw sensor reading |
| `GET` | `/api/dashboard/live` | Real-time live telemetry stream for speedometer & map |
| `GET` | `/api/dashboard/summary` | Aggregated metrics, historical graphs, and distributions |
| `GET` | `/api/trips` | Returns recent trips log |
| `GET` | `/api/trips/{trip_id}` | Detailed trip trajectory, speed/accel graphs, and ML prediction |
| `GET` | `/api/events` | Filterable safety events log (`event_type`, `severity`, `driver_id`, `trip_id`) |
| `POST` | `/api/ml/predict` | Live inference endpoint with 10 feature inputs |
| `GET` | `/api/ml/metrics` | Returns trained Random Forest metrics (Accuracy, F1, Confusion Matrix) |

---

## 🔍 Troubleshooting Guide

### 1. "Failed to fetch dashboard data"
- **Cause:** Backend server is not running on port 8000, or frontend API base URL was mismatched.
- **Solution:** Verify backend is running by navigating to [http://localhost:8000/api/health](http://localhost:8000/api/health). Ensure `frontend/.env` contains `VITE_API_BASE_URL=http://localhost:8000`.

### 2. "Waiting for sensor data..." / Speed & Acceleration showing 0
- **Cause:** Neither the ESP32 nor the software IoT simulator is currently transmitting telemetry to `/api/sensor-data`.
- **Solution:** Start the simulator:
  ```bash
  .\venv\Scripts\python.exe iot_simulator/sensor_simulator.py --scenario normal
  ```

### 3. "🔴 Backend Offline" displayed in header
- **Cause:** React is running but cannot connect to `http://localhost:8000/api/health`.
- **Solution:** Start the backend with `python -m uvicorn main:app --reload --port 8000`.

### 4. MongoDB Unavailable / Development Mode
- **Feature:** If MongoDB is not running locally or in MongoDB Atlas, the backend automatically activates **Development Mode** backed by SQLite. The dashboard displays `🟢 System Online | Development Mode` and works seamlessly without requiring any external database installation.

### 5. CORS Errors
- **Solution:** Backend CORS is pre-configured for `http://localhost:5173`, `http://localhost:3000`, and all localhost origins.

### 6. Missing ML Model
- **Solution:** Run `.\venv\Scripts\python.exe ml/train.py` to compile `rf_model.joblib` and `metrics.json`.

---

## ⚠️ Limitations & Future Work

1. **Edge Inference:** Future versions will port the Random Forest model to TensorFlow Lite Micro to execute inferences directly on the ESP32 chip.
2. **MQTT Telemetry:** Migrate high-frequency streaming from HTTP REST to an MQTT broker for reduced network overhead.
3. **OBD-II Integration:** Supplement IMU and GPS with CAN-bus vehicle speed and RPM data.
#   I o T - B a s e d - S m a r t - D r i v e r - S a f e t y - M o n i t o r i n g - S y s t e m  
 