import os
import sys
import json
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Query
from config import settings
from database import get_database
from schemas.sensor import (
    SensorDataCreate,
    SensorDataResponse,
    LiveTelemetryResponse,
    HealthResponse
)
from services.event_detector import detect_events
from services.safety_scorer import calculate_score_deductions, get_classification

# Add ML directory to path
ML_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml"))
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

try:
    from predict import predict_driver_behavior
except ImportError:
    predict_driver_behavior = None

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

# HEALTH CHECK
@router.get("/health", response_model=HealthResponse)
async def health_check():
    db = get_database()
    return {
        "status": "ok",
        "service": "smart-driver-iot-backend",
        "database": db.get_status(),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# SENSOR DATA INGESTION
@router.post("/sensor-data", response_model=SensorDataResponse)
async def receive_sensor_data(data: SensorDataCreate):
    db = get_database()
    
    # Ensure timestamp is set
    if not data.timestamp:
        data.timestamp = datetime.now(timezone.utc).isoformat()
    elif isinstance(data.timestamp, datetime):
        data.timestamp = data.timestamp.isoformat()
        
    device_id = data.device_id or data.vehicle_id or "ESP32-001"
    data.device_id = device_id
    
    # 1. Insert raw sensor reading
    data_dict = data.model_dump()
    await db.insert_sensor_data(data_dict)
    
    # 2. Run real event detection
    detected_events = detect_events(data)
    
    # 3. Fetch existing trip or initialize
    existing_trip = await db.get_trip(data.trip_id)
    current_score = 100.0
    if existing_trip and "safety_score" in existing_trip:
        current_score = float(existing_trip["safety_score"])
        
    latest_event_info = None
    if detected_events:
        event_dicts = [e.model_dump() for e in detected_events]
        await db.insert_events(event_dicts)
        
        # Deduct penalties
        deduction = calculate_score_deductions(detected_events)
        new_score = max(0.0, min(100.0, round(current_score - deduction, 1)))
        classification = get_classification(new_score)
        
        await db.upsert_trip(
            trip_id=data.trip_id,
            driver_id=data.driver_id,
            timestamp=str(data.timestamp),
            safety_score=new_score,
            classification=classification,
            speed_kmh=data.speed_kmh,
            event_count_increment=len(detected_events)
        )
        latest_event_info = event_dicts[-1]
    else:
        new_score = current_score
        classification = get_classification(new_score)
        await db.upsert_trip(
            trip_id=data.trip_id,
            driver_id=data.driver_id,
            timestamp=str(data.timestamp),
            safety_score=new_score,
            classification=classification,
            speed_kmh=data.speed_kmh,
            event_count_increment=0
        )
        
    return {
        "success": True,
        "message": "Sensor data received",
        "event": latest_event_info,
        "safety_score": new_score
    }

# LATEST SENSOR READING
@router.get("/sensor-data/latest")
async def get_latest_sensor_data():
    db = get_database()
    latest = await db.get_latest_sensor_data()
    if not latest:
        return {"data": None, "message": "No sensor data available"}
    return {"data": latest, "message": "Success"}

# LIVE TELEMETRY STREAM
@router.get("/dashboard/live")
async def get_dashboard_live():
    db = get_database()
    latest_sensor = await db.get_latest_sensor_data()
    
    if not latest_sensor:
        return {
            "has_data": False,
            "speed": 0.0,
            "acceleration": {"x": 0.0, "y": 0.0, "z": 0.0},
            "gyroscope": {"x": 0.0, "y": 0.0, "z": 0.0},
            "latitude": 13.0827,
            "longitude": 80.2707,
            "safety_score": 100.0,
            "classification": "SAFE",
            "latest_event": None,
            "timestamp": None,
            "message": "No sensor data available"
        }
        
    # Find trip for this sensor data
    trip = await db.get_trip(latest_sensor.get("trip_id", "TRIP001"))
    safety_score = trip.get("safety_score", 100.0) if trip else 100.0
    classification = trip.get("classification", "SAFE") if trip else "SAFE"
    
    # Get latest event if any
    recent_events = await db.get_events(limit=1, trip_id=latest_sensor.get("trip_id"))
    latest_event_str = None
    if recent_events:
        ev = recent_events[0]
        latest_event_str = f"{ev.get('event_type')} ({ev.get('severity')})"
        
    return {
        "has_data": True,
        "speed": round(float(latest_sensor.get("speed_kmh", 0.0)), 1),
        "acceleration": {
            "x": round(float(latest_sensor.get("acceleration_x", 0.0)), 2),
            "y": round(float(latest_sensor.get("acceleration_y", 0.0)), 2),
            "z": round(float(latest_sensor.get("acceleration_z", 0.0)), 2)
        },
        "gyroscope": {
            "x": round(float(latest_sensor.get("gyroscope_x", 0.0)), 2),
            "y": round(float(latest_sensor.get("gyroscope_y", 0.0)), 2),
            "z": round(float(latest_sensor.get("gyroscope_z", 0.0)), 2)
        },
        "latitude": float(latest_sensor.get("latitude", 13.0827)),
        "longitude": float(latest_sensor.get("longitude", 80.2707)),
        "safety_score": round(float(safety_score), 1),
        "classification": classification,
        "latest_event": latest_event_str,
        "timestamp": latest_sensor.get("timestamp"),
        "trip_id": latest_sensor.get("trip_id"),
        "driver_id": latest_sensor.get("driver_id")
    }

# DASHBOARD SUMMARY
@router.get("/dashboard/summary")
async def get_dashboard_summary():
    db = get_database()
    
    total_trips = await db.count_trips()
    total_events = await db.count_events()
    events_breakdown = await db.get_events_breakdown()
    latest_sensor = await db.get_latest_sensor_data()
    
    latest_trip = None
    if latest_sensor and latest_sensor.get("trip_id"):
        latest_trip = await db.get_trip(latest_sensor.get("trip_id"))
    elif total_trips > 0:
        trips = await db.get_trips(limit=1)
        if trips:
            latest_trip = trips[0]
            
    recent_history = await db.get_recent_sensor_data(limit=30)
    classification_dist = await db.get_classification_distribution()
    
    return {
        "total_trips": total_trips,
        "total_events": total_events,
        "events_breakdown": events_breakdown,
        "latest_sensor": latest_sensor,
        "latest_trip": latest_trip,
        "recent_history": recent_history,
        "classification_distribution": classification_dist
    }

# TRIPS LIST
@router.get("/trips")
async def get_trips(limit: int = Query(default=20, ge=1, le=100)):
    db = get_database()
    return await db.get_trips(limit=limit)

# TRIP DETAILS
@router.get("/trips/{trip_id}")
async def get_trip_details(trip_id: str):
    db = get_database()
    trip = await db.get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    sensors = await db.get_recent_sensor_data(trip_id=trip_id, limit=200)
    events = await db.get_events(trip_id=trip_id, limit=50)
    
    # Compute trip-level feature vector for ML classification
    ml_pred = None
    if sensors and predict_driver_behavior:
        speeds = [s["speed_kmh"] for s in sensors]
        accels = [s["acceleration_x"] for s in sensors]
        gyros = [s["gyroscope_z"] for s in sensors]
        
        avg_speed = sum(speeds) / len(speeds) if speeds else 0.0
        max_speed = max(speeds) if speeds else 0.0
        avg_accel = sum(accels) / len(accels) if accels else 0.0
        max_accel = max(accels) if accels else 0.0
        
        accel_var = sum((a - avg_accel) ** 2 for a in accels) / len(accels) if len(accels) > 1 else 0.1
        avg_gyro = sum(gyros) / len(gyros) if gyros else 0.0
        gyro_var = sum((g - avg_gyro) ** 2 for g in gyros) / len(gyros) if len(gyros) > 1 else 0.1
        
        harsh_braking_cnt = sum(1 for e in events if e.get("event_type") == "HARSH_BRAKING")
        sudden_accel_cnt = sum(1 for e in events if e.get("event_type") == "SUDDEN_ACCELERATION")
        sharp_turn_cnt = sum(1 for e in events if e.get("event_type") == "SHARP_TURN")
        overspeed_cnt = sum(1 for e in events if e.get("event_type") == "OVERSPEED")
        
        features = {
            "average_speed": round(avg_speed, 2),
            "maximum_speed": round(max_speed, 2),
            "average_acceleration": round(avg_accel, 2),
            "maximum_acceleration": round(max_accel, 2),
            "harsh_braking_count": harsh_braking_cnt,
            "sudden_acceleration_count": sudden_accel_cnt,
            "sharp_turn_count": sharp_turn_cnt,
            "overspeed_count": overspeed_cnt,
            "acceleration_variance": round(accel_var, 3),
            "gyroscope_variance": round(gyro_var, 3)
        }
        try:
            ml_pred = predict_driver_behavior(features)
        except Exception as e:
            logger.warning(f"Trip ML prediction failed: {e}")
            
    return {
        "trip": trip,
        "sensors": sensors,
        "events": events,
        "ml_prediction": ml_pred
    }

# EVENTS LIST WITH FILTERS
@router.get("/events")
async def get_events(
    limit: int = Query(default=50, ge=1, le=200),
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    driver_id: Optional[str] = None,
    trip_id: Optional[str] = None
):
    db = get_database()
    return await db.get_events(
        limit=limit,
        event_type=event_type,
        severity=severity,
        driver_id=driver_id,
        trip_id=trip_id
    )

# ML PREDICTION
@router.post("/ml/predict")
async def predict_behavior(features: Dict[str, Any]):
    if predict_driver_behavior is None:
        raise HTTPException(status_code=503, detail="ML prediction module not available")
        
    try:
        result = predict_driver_behavior(features)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")

# ML METRICS
@router.get("/ml/metrics")
async def get_ml_metrics():
    metrics_candidates = [
        os.path.join(ML_DIR, "model", "metrics.json"),
        os.path.join(os.path.dirname(__file__), "..", "..", "ml", "model", "metrics.json"),
        "ml/model/metrics.json"
    ]
    for p in metrics_candidates:
        if os.path.exists(p):
            with open(p, "r") as f:
                return json.load(f)
                
    # If not found, run evaluate_model() on the fly
    try:
        from evaluate import evaluate_model
        return evaluate_model()
    except Exception as e:
        return {"error": f"Metrics could not be generated: {e}"}
