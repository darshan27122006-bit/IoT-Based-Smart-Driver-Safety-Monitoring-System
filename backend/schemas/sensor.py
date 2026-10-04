from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, Union
from datetime import datetime

class SensorDataCreate(BaseModel):
    device_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    driver_id: str = "DRV001"
    trip_id: str = "TRIP001"
    timestamp: Optional[Union[datetime, str]] = None
    speed_kmh: float
    acceleration_x: float
    acceleration_y: float
    acceleration_z: float
    gyroscope_x: float
    gyroscope_y: float
    gyroscope_z: float
    latitude: float
    longitude: float
    braking_intensity: Optional[float] = 0.0
    throttle_intensity: Optional[float] = 0.0
    road_condition: Optional[str] = "normal"

    @field_validator("device_id", mode="before")
    @classmethod
    def set_device_id(cls, v, info):
        if v:
            return str(v)
        # If vehicle_id is provided in values, we fallback to it
        data = info.data if hasattr(info, "data") else {}
        return data.get("vehicle_id", "ESP32-001")

class SensorDataResponse(BaseModel):
    success: bool = True
    message: str = "Sensor data received"
    event: Optional[Dict[str, Any]] = None
    safety_score: float = 100.0

class EventCreate(BaseModel):
    event_id: str
    driver_id: str
    trip_id: str
    timestamp: str
    event_type: str
    severity: str
    latitude: float
    longitude: float
    speed_kmh: Optional[float] = 0.0
    sensor_values: Dict[str, Any] = {}

class LiveTelemetryResponse(BaseModel):
    speed: float
    acceleration: Dict[str, float]
    gyroscope: Dict[str, float]
    latitude: float
    longitude: float
    safety_score: float
    classification: str
    latest_event: Optional[str] = None
    timestamp: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    service: str
    database: str
    timestamp: str
