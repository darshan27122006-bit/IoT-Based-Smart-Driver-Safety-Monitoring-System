import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    port: int = 8000
    host: str = "0.0.0.0"
    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    database_name: str = os.getenv("DATABASE_NAME", "smart_driver_iot")
    api_base_url: str = os.getenv("API_BASE_URL", "http://localhost:8000")
    
    # CORS
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    # Event Detection Thresholds (Configurable)
    speed_limit: float = 60.0  # km/h
    harsh_braking_threshold: float = -4.0  # m/s^2 (negative deceleration)
    sudden_acceleration_threshold: float = 4.0  # m/s^2
    sharp_turn_threshold: float = 3.0  # rad/s for gyroscope z-axis
    
    # Safety Score Penalty Matrix
    penalty_overspeed_low: float = 2.0
    penalty_overspeed_med: float = 5.0
    penalty_overspeed_high: float = 10.0
    
    penalty_harsh_braking_low: float = 2.0
    penalty_harsh_braking_med: float = 5.0
    penalty_harsh_braking_high: float = 8.0
    
    penalty_sudden_accel_low: float = 2.0
    penalty_sudden_accel_med: float = 4.0
    penalty_sudden_accel_high: float = 7.0
    
    penalty_sharp_turn_low: float = 2.0
    penalty_sharp_turn_med: float = 4.0
    penalty_sharp_turn_high: float = 6.0
    
    # Classification Thresholds
    score_safe_min: float = 80.0
    score_moderate_min: float = 60.0
    
    model_config = {
        "env_file": [".env", "../.env"],
        "extra": "ignore"
    }

settings = Settings()
