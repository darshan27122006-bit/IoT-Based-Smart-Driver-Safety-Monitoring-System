import pandas as pd
import numpy as np
import os

def generate_synthetic_dataset(num_samples=1500, output_path=None):
    np.random.seed(42)
    
    if output_path is None:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        output_path = os.path.join(base_dir, "dataset", "driver_behavior.csv")
        
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    data = []
    
    # 50% SAFE, 30% MODERATE, 20% RISKY
    types = np.random.choice(["SAFE", "MODERATE", "RISKY"], size=num_samples, p=[0.50, 0.30, 0.20])
    
    for behavior in types:
        if behavior == "SAFE":
            avg_speed = np.random.normal(42.0, 7.5)
            max_speed = avg_speed + np.random.normal(12.0, 4.0)
            avg_accel = np.random.normal(0.65, 0.2)
            max_accel = np.random.normal(2.1, 0.5)
            harsh_braking = np.random.poisson(0.15)
            sudden_accel = np.random.poisson(0.15)
            sharp_turn = np.random.poisson(0.25)
            overspeed = np.random.poisson(0.10)
            accel_var = np.random.normal(0.9, 0.25)
            gyro_var = np.random.normal(0.45, 0.15)
            
        elif behavior == "MODERATE":
            avg_speed = np.random.normal(58.0, 9.0)
            max_speed = avg_speed + np.random.normal(18.0, 5.5)
            avg_accel = np.random.normal(1.25, 0.35)
            max_accel = np.random.normal(3.8, 0.7)
            harsh_braking = np.random.poisson(1.4)
            sudden_accel = np.random.poisson(1.3)
            sharp_turn = np.random.poisson(1.8)
            overspeed = np.random.poisson(1.2)
            accel_var = np.random.normal(2.2, 0.45)
            gyro_var = np.random.normal(1.3, 0.3)
            
        else: # RISKY
            avg_speed = np.random.normal(76.0, 11.0)
            max_speed = avg_speed + np.random.normal(26.0, 7.0)
            avg_accel = np.random.normal(1.95, 0.45)
            max_accel = np.random.normal(5.8, 1.1)
            harsh_braking = np.random.poisson(3.8)
            sudden_accel = np.random.poisson(3.6)
            sharp_turn = np.random.poisson(4.2)
            overspeed = np.random.poisson(4.0)
            accel_var = np.random.normal(4.1, 0.8)
            gyro_var = np.random.normal(2.9, 0.6)
            
        data.append({
            "average_speed": round(max(5.0, avg_speed), 2),
            "maximum_speed": round(max(avg_speed + 2.0, max_speed), 2),
            "average_acceleration": round(max(0.1, avg_accel), 2),
            "maximum_acceleration": round(max(avg_accel + 0.5, max_accel), 2),
            "harsh_braking_count": int(max(0, harsh_braking)),
            "sudden_acceleration_count": int(max(0, sudden_accel)),
            "sharp_turn_count": int(max(0, sharp_turn)),
            "overspeed_count": int(max(0, overspeed)),
            "acceleration_variance": round(max(0.05, accel_var), 3),
            "gyroscope_variance": round(max(0.05, gyro_var), 3),
            "driving_behavior": behavior
        })
        
    df = pd.DataFrame(data)
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} samples saved to: {output_path}")
    return df

if __name__ == "__main__":
    generate_synthetic_dataset()
