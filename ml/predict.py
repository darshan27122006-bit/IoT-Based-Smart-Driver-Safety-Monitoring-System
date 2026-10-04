import os
import sys
import joblib
import pandas as pd
from typing import Dict, Any

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from preprocess import FEATURE_COLUMNS

_model = None

def get_model():
    global _model
    if _model is None:
        model_path = os.path.join(CURRENT_DIR, "model", "rf_model.joblib")
        if not os.path.exists(model_path):
            from train import train_model
            train_model()
        _model = joblib.load(model_path)
    return _model

def predict_driver_behavior(features: Dict[str, Any]) -> Dict[str, Any]:
    model = get_model()
    
    # Map input features ensuring all required columns exist
    row = {}
    for col in FEATURE_COLUMNS:
        row[col] = float(features.get(col, 0.0))
        
    df = pd.DataFrame([row], columns=FEATURE_COLUMNS)
    pred = model.predict(df)[0]
    
    probabilities = {}
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(df)[0]
        classes = model.classes_
        for cls, prob in zip(classes, probs):
            probabilities[str(cls)] = round(float(prob), 4)
            
    return {
        "prediction": str(pred),
        "confidence": round(float(max(probabilities.values())) if probabilities else 1.0, 4),
        "probabilities": probabilities,
        "features_used": row
    }

if __name__ == "__main__":
    sample = {
        "average_speed": 75.0,
        "maximum_speed": 105.0,
        "average_acceleration": 2.2,
        "maximum_acceleration": 5.5,
        "harsh_braking_count": 3,
        "sudden_acceleration_count": 4,
        "sharp_turn_count": 3,
        "overspeed_count": 5,
        "acceleration_variance": 3.8,
        "gyroscope_variance": 2.5
    }
    result = predict_driver_behavior(sample)
    print("Sample Prediction:", result)
