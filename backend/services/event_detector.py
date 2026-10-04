import uuid
from datetime import datetime
from config import settings
from schemas.sensor import SensorDataCreate, EventCreate
from typing import List

def detect_events(data: SensorDataCreate) -> List[EventCreate]:
    events = []
    ts_str = str(data.timestamp) if data.timestamp else datetime.utcnow().isoformat()
    
    # 1. OVERSPEED
    if data.speed_kmh > settings.speed_limit:
        over = data.speed_kmh - settings.speed_limit
        if over > 25:
            severity = "HIGH"
        elif over > 10:
            severity = "MEDIUM"
        else:
            severity = "LOW"
            
        events.append(EventCreate(
            event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
            driver_id=data.driver_id,
            trip_id=data.trip_id,
            timestamp=ts_str,
            event_type="OVERSPEED",
            severity=severity,
            latitude=data.latitude,
            longitude=data.longitude,
            speed_kmh=data.speed_kmh,
            sensor_values={
                "speed_kmh": round(data.speed_kmh, 2),
                "threshold": settings.speed_limit
            }
        ))
        
    # 2. HARSH_BRAKING (negative acceleration forward)
    # Threshold is negative (e.g. -4.0 m/s^2)
    if data.acceleration_x < settings.harsh_braking_threshold:
        diff = abs(data.acceleration_x - settings.harsh_braking_threshold)
        if diff > 3.0:
            severity = "HIGH"
        elif diff > 1.5:
            severity = "MEDIUM"
        else:
            severity = "LOW"
            
        events.append(EventCreate(
            event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
            driver_id=data.driver_id,
            trip_id=data.trip_id,
            timestamp=ts_str,
            event_type="HARSH_BRAKING",
            severity=severity,
            latitude=data.latitude,
            longitude=data.longitude,
            speed_kmh=data.speed_kmh,
            sensor_values={
                "acceleration_x": round(data.acceleration_x, 2),
                "threshold": settings.harsh_braking_threshold
            }
        ))
        
    # 3. SUDDEN_ACCELERATION (positive forward acceleration)
    # Threshold is positive (e.g. 4.0 m/s^2)
    if data.acceleration_x > settings.sudden_acceleration_threshold:
        diff = data.acceleration_x - settings.sudden_acceleration_threshold
        if diff > 3.0:
            severity = "HIGH"
        elif diff > 1.5:
            severity = "MEDIUM"
        else:
            severity = "LOW"
            
        events.append(EventCreate(
            event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
            driver_id=data.driver_id,
            trip_id=data.trip_id,
            timestamp=ts_str,
            event_type="SUDDEN_ACCELERATION",
            severity=severity,
            latitude=data.latitude,
            longitude=data.longitude,
            speed_kmh=data.speed_kmh,
            sensor_values={
                "acceleration_x": round(data.acceleration_x, 2),
                "threshold": settings.sudden_acceleration_threshold
            }
        ))
        
    # 4. SHARP_TURN (high angular velocity on gyroscope Z or high lateral acceleration Y)
    gyro_z_abs = abs(data.gyroscope_z)
    if gyro_z_abs > settings.sharp_turn_threshold or abs(data.acceleration_y) > 3.5:
        diff = gyro_z_abs - settings.sharp_turn_threshold
        if diff > 2.0 or abs(data.acceleration_y) > 5.0:
            severity = "HIGH"
        elif diff > 1.0 or abs(data.acceleration_y) > 4.0:
            severity = "MEDIUM"
        else:
            severity = "LOW"
            
        events.append(EventCreate(
            event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
            driver_id=data.driver_id,
            trip_id=data.trip_id,
            timestamp=ts_str,
            event_type="SHARP_TURN",
            severity=severity,
            latitude=data.latitude,
            longitude=data.longitude,
            speed_kmh=data.speed_kmh,
            sensor_values={
                "gyroscope_z": round(data.gyroscope_z, 2),
                "acceleration_y": round(data.acceleration_y, 2),
                "threshold": settings.sharp_turn_threshold
            }
        ))

    # 5. ABNORMAL_BEHAVIOR (simultaneous overspeed + high lateral gyro/accel or erratic swerving)
    if data.speed_kmh > settings.speed_limit and (gyro_z_abs > 2.0 or abs(data.acceleration_y) > 3.0):
        events.append(EventCreate(
            event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
            driver_id=data.driver_id,
            trip_id=data.trip_id,
            timestamp=ts_str,
            event_type="ABNORMAL_BEHAVIOR",
            severity="HIGH" if data.speed_kmh > settings.speed_limit + 15 else "MEDIUM",
            latitude=data.latitude,
            longitude=data.longitude,
            speed_kmh=data.speed_kmh,
            sensor_values={
                "speed_kmh": round(data.speed_kmh, 2),
                "gyroscope_z": round(data.gyroscope_z, 2),
                "acceleration_y": round(data.acceleration_y, 2)
            }
        ))
        
    return events
