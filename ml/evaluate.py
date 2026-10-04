import os
import sys
import json
import joblib
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from preprocess import load_and_preprocess_data

def evaluate_model():
    model_path = os.path.join(CURRENT_DIR, "model", "rf_model.joblib")
    if not os.path.exists(model_path):
        print("Model file not found. Running training first...")
        from train import train_model
        return train_model()
        
    rf_model = joblib.load(model_path)
    X_train, X_test, y_train, y_test, features = load_and_preprocess_data()
    
    y_pred = rf_model.predict(X_test)
    classes = sorted(list(set(y_test)))
    
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
    rec = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
    f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
    cm = confusion_matrix(y_test, y_pred, labels=classes).tolist()
    
    metrics = {
        "model": "Random Forest Classifier",
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "confusion_matrix": cm,
        "classes": classes,
        "test_samples": len(y_test)
    }
    
    print("\n================ Evaluation Results ================")
    print(f"Accuracy:  {metrics['accuracy'] * 100:.2f}%")
    print(f"Precision: {metrics['precision'] * 100:.2f}%")
    print(f"Recall:    {metrics['recall'] * 100:.2f}%")
    print(f"F1 Score:  {metrics['f1_score'] * 100:.2f}%")
    print(f"Classes:   {classes}")
    print(f"Confusion Matrix: {cm}")
    print("\nDetailed Classification Report:")
    print(classification_report(y_test, y_pred))
    
    metrics_file = os.path.join(CURRENT_DIR, "model", "metrics.json")
    with open(metrics_file, "w") as f:
        json.dump(metrics, f, indent=4)
        
    return metrics

if __name__ == "__main__":
    evaluate_model()
