import pandas as pd
import os
from sklearn.model_selection import train_test_split

FEATURE_COLUMNS = [
    "average_speed",
    "maximum_speed",
    "average_acceleration",
    "maximum_acceleration",
    "harsh_braking_count",
    "sudden_acceleration_count",
    "sharp_turn_count",
    "overspeed_count",
    "acceleration_variance",
    "gyroscope_variance"
]

TARGET_COLUMN = "driving_behavior"

def load_and_preprocess_data(dataset_path=None, test_size=0.2, random_state=42):
    if dataset_path is None:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        dataset_path = os.path.join(base_dir, "dataset", "driver_behavior.csv")
        
    from generate_dataset import generate_synthetic_dataset
    if not os.path.exists(dataset_path):
        generate_synthetic_dataset(output_path=dataset_path)
        
    df = pd.read_csv(dataset_path)
    
    # Handle column aliases if old csv is loaded
    if "max_speed" in df.columns and "maximum_speed" not in df.columns:
        df["maximum_speed"] = df["max_speed"]
    if "max_accel" in df.columns and "maximum_acceleration" not in df.columns:
        df["maximum_acceleration"] = df["max_accel"]
    if "maximum_acceleration" not in df.columns and "max_acceleration" in df.columns:
        df["maximum_acceleration"] = df["max_acceleration"]
        
    if not all(col in df.columns for col in FEATURE_COLUMNS):
        # Regenerate fresh dataset with exact schema
        df = generate_synthetic_dataset(output_path=dataset_path)
    
    df = df.dropna()
    X = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN]
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )
    
    return X_train, X_test, y_train, y_test, FEATURE_COLUMNS
