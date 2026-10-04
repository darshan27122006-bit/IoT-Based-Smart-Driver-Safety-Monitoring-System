import os
import sys
import json
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report

# Ensure local imports work whether executed from ml/ or root
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from preprocess import load_and_preprocess_data, FEATURE_COLUMNS

def train_model():
    print("Loading and preprocessing dataset...")
    dataset_path = os.path.join(CURRENT_DIR, "dataset", "driver_behavior.csv")
    X_train, X_test, y_train, y_test, features = load_and_preprocess_data(dataset_path=dataset_path)
    
    print(f"Training Random Forest on {len(X_train)} samples across features: {features}")
    rf_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_split=4,
        random_state=42
    )
    rf_model.fit(X_train, y_train)
    
    y_pred = rf_model.predict(X_test)
    classes = sorted(list(set(y_test)))
    
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
    rec = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
    f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
    cm = confusion_matrix(y_test, y_pred, labels=classes).tolist()
    
    metrics = {
        "model": "Random Forest Classifier",
        "n_estimators": 100,
        "features": features,
        "classes": classes,
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "confusion_matrix": cm,
        "test_samples": len(y_test)
    }
    
    print("\n--- Model Performance ---")
    print(classification_report(y_test, y_pred))
    print(f"Confusion Matrix (labels: {classes}):")
    print(cm)
    
    model_dir = os.path.join(CURRENT_DIR, "model")
    os.makedirs(model_dir, exist_ok=True)
    
    model_file = os.path.join(model_dir, "rf_model.joblib")
    metrics_file = os.path.join(model_dir, "metrics.json")
    
    joblib.dump(rf_model, model_file)
    with open(metrics_file, "w") as f:
        json.dump(metrics, f, indent=4)
        
    print(f"Model saved to: {model_file}")
    print(f"Metrics saved to: {metrics_file}")
    return metrics

if __name__ == "__main__":
    train_model()
