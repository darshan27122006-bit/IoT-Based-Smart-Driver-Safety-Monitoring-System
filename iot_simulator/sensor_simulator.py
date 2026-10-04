#!/usr/bin/env python3
"""
IoT Sensor Simulator for Smart Driver IoT
Generates realistic correlated time-series sensor data (Speed, MPU6050 Accelerometer/Gyroscope, and GPS)
Simulating physical vehicle dynamics in the Chennai metropolitan area.
"""

import time
import math
import random
import json
import argparse
import sys
from datetime import datetime, timezone
import requests

class VehicleMotionSimulator:
    def __init__(self, scenario="safe", start_lat=13.0500, start_lon=80.2800):
        self.scenario = scenario.lower()
        # Simulated Chennai-area coordinates
        self.lat = start_lat
        self.lon = start_lon
        self.heading_rad = math.radians(25.0) # North-North-East along coastal route
        
        # Initial motion states
        if self.scenario == "safe":
            self.current_speed_kmh = 42.0
        elif self.scenario == "normal":
            self.current_speed_kmh = 52.0
        elif self.scenario == "aggressive":
            self.current_speed_kmh = 68.0
        else: # risky
            self.current_speed_kmh = 82.0
            
        self.step_count = 0
        self.gravity = 9.806

    def update_physics(self, dt=1.0):
        self.step_count += 1
        
        # Target speed ranges based on scenario
        if self.scenario == "safe":
            target_min, target_max = 35.0, 48.0
            turn_intensity = 0.35
            event_chance = 0.02
        elif self.scenario == "normal":
            target_min, target_max = 45.0, 62.0
            turn_intensity = 0.70
            event_chance = 0.05
        elif self.scenario == "aggressive":
            target_min, target_max = 62.0, 85.0
            turn_intensity = 1.40
            event_chance = 0.20
        else: # risky
            target_min, target_max = 75.0, 105.0
            turn_intensity = 2.20
            event_chance = 0.38

        # Decide whether this step triggers a notable driving maneuver
        r = random.random()
        is_event_step = (r < event_chance)
        maneuver = None
        if is_event_step:
            maneuvers = ["overspeed", "harsh_braking", "sudden_accel", "sharp_turn"]
            maneuver = random.choice(maneuvers)

        # 1. Forward Acceleration (accel_x) and Speed computation
        if maneuver == "harsh_braking":
            accel_x = random.uniform(-6.2, -4.3) # Harsh braking threshold is -4.0
            target_speed = max(15.0, self.current_speed_kmh - 22.0)
        elif maneuver == "sudden_accel":
            accel_x = random.uniform(4.2, 5.8)  # Sudden acceleration threshold is 4.0
            target_speed = min(120.0, self.current_speed_kmh + 20.0)
        elif maneuver == "overspeed":
            accel_x = random.uniform(1.5, 3.2)
            target_speed = random.uniform(85.0, 110.0)
        else:
            # Smooth cruise control / realistic driving variation
            desired_speed = random.uniform(target_min, target_max)
            speed_error = (desired_speed - self.current_speed_kmh)
            accel_x = max(-3.0, min(3.0, speed_error * 0.35)) + random.gauss(0.0, 0.25)
            target_speed = desired_speed

        # Update speed via physics integration
        speed_delta = (accel_x * dt) * 3.6
        self.current_speed_kmh = max(5.0, self.current_speed_kmh + speed_delta)
        
        # 2. Steering & Gyroscope (gyro_z) and Lateral Acceleration (accel_y)
        if maneuver == "sharp_turn":
            direction = random.choice([-1.0, 1.0])
            gyro_z = direction * random.uniform(3.2, 4.5) # Sharp turn threshold is 3.0
            accel_y = direction * random.uniform(3.5, 5.2)
            self.heading_rad += (gyro_z * dt * 0.15)
        else:
            # Gradual road curvature
            road_curve = math.sin(self.step_count * 0.12) * turn_intensity
            gyro_z = road_curve + random.gauss(0.0, 0.15)
            accel_y = (gyro_z * 0.7) + random.gauss(0.0, 0.1)
            self.heading_rad += (gyro_z * dt * 0.05)

        # Normal road vibration on X & Y gyro
        gyro_x = random.gauss(0.0, 0.08)
        gyro_y = random.gauss(0.0, 0.08)
        
        # Vertical acceleration (accel_z) includes Earth gravity + road bumps
        road_bump = random.gauss(0.0, 0.25)
        accel_z = self.gravity + road_bump

        # 3. GPS Position Update along simulated Chennai corridor
        speed_mps = (self.current_speed_kmh / 3.6)
        distance_meters = speed_mps * dt
        
        # Meters to degrees lat/lon
        d_lat = (distance_meters * math.cos(self.heading_rad)) / 111320.0
        d_lon = (distance_meters * math.sin(self.heading_rad)) / (111320.0 * math.cos(math.radians(self.lat)))
        
        self.lat += d_lat
        self.lon += d_lon
        
        # Prevent drift out of greater Chennai bounding box
        if not (12.90 <= self.lat <= 13.20):
            self.heading_rad += math.pi
        if not (80.15 <= self.lon <= 80.35):
            self.heading_rad += math.pi

        return {
            "speed_kmh": round(self.current_speed_kmh, 2),
            "acceleration_x": round(accel_x, 2),
            "acceleration_y": round(accel_y, 2),
            "acceleration_z": round(accel_z, 2),
            "gyroscope_x": round(gyro_x, 2),
            "gyroscope_y": round(gyro_y, 2),
            "gyroscope_z": round(gyro_z, 2),
            "latitude": round(self.lat, 6),
            "longitude": round(self.lon, 6)
        }

def run_simulator(args):
    scenario = args.scenario.upper()
    print("=" * 65)
    print("  SMART DRIVER IoT - SENSOR SIMULATOR (DEV/DEMO MODE)")
    print("=" * 65)
    print(f"Scenario:    {scenario}")
    print(f"Interval:    {args.interval}s")
    print(f"Duration:    {'Continuous' if args.duration <= 0 else f'{args.duration}s'}")
    print(f"Driver ID:   {args.driver_id}")
    print(f"Trip ID:     {args.trip_id}")
    print(f"Target URL:  {args.backend_url}")
    print("Starting simulated sensor stream...\n")
    
    sim = VehicleMotionSimulator(scenario=args.scenario)
    step = 0
    start_time = time.time()
    
    try:
        while True:
            step += 1
            motion = sim.update_physics(dt=args.interval)
            
            payload = {
                "device_id": args.device_id,
                "driver_id": args.driver_id,
                "trip_id": args.trip_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "speed_kmh": motion["speed_kmh"],
                "acceleration_x": motion["acceleration_x"],
                "acceleration_y": motion["acceleration_y"],
                "acceleration_z": motion["acceleration_z"],
                "gyroscope_x": motion["gyroscope_x"],
                "gyroscope_y": motion["gyroscope_y"],
                "gyroscope_z": motion["gyroscope_z"],
                "latitude": motion["latitude"],
                "longitude": motion["longitude"],
                "braking_intensity": round(abs(motion["acceleration_x"]) / 6.0, 2) if motion["acceleration_x"] < 0 else 0.0,
                "throttle_intensity": round(abs(motion["acceleration_x"]) / 6.0, 2) if motion["acceleration_x"] > 0 else 0.3,
                "road_condition": "dry"
            }
            
            # Transmit to FastAPI Backend
            try:
                resp = requests.post(args.backend_url, json=payload, timeout=2.5)
                if resp.status_code == 200:
                    data = resp.json()
                    evt_str = f" | [EVENT DETECTED: {data['event']['event_type']} ({data['event']['severity']})]" if data.get("event") else ""
                    print(f"[{step:03d}] Sent: {payload['speed_kmh']:5.1f} km/h | AccelX: {payload['acceleration_x']:+5.2f} m/s² | GyroZ: {payload['gyroscope_z']:+5.2f} rad/s | Score: {data.get('safety_score', 100)}{evt_str}")
                else:
                    print(f"[{step:03d}] HTTP {resp.status_code}: {resp.text}")
            except requests.exceptions.RequestException as e:
                print(f"[{step:03d}] Failed to reach backend at {args.backend_url}: {e}")
                
            if args.duration > 0 and (time.time() - start_time) >= args.duration:
                print(f"\nCompleted {args.duration}s simulation run.")
                break
                
            time.sleep(args.interval)
            
    except KeyboardInterrupt:
        print("\nSimulator stopped by user.")

def main():
    parser = argparse.ArgumentParser(description="Smart Driver IoT - Sensor Simulator")
    parser.add_argument("--scenario", type=str, choices=["safe", "normal", "aggressive", "risky", "SAFE", "NORMAL", "AGGRESSIVE", "RISKY"], default="normal", help="Driving behavior profile")
    parser.add_argument("--interval", type=float, default=1.0, help="Interval between readings in seconds (default: 1.0)")
    parser.add_argument("--duration", type=int, default=0, help="Duration in seconds (0 = run continuously)")
    parser.add_argument("--backend-url", type=str, default="http://localhost:8000/api/sensor-data", help="Backend ingestion endpoint")
    parser.add_argument("--driver-id", type=str, default="DRV001", help="Driver ID identifier")
    parser.add_argument("--trip-id", type=str, default="TRIP001", help="Trip ID identifier")
    parser.add_argument("--device-id", type=str, default="ESP32-001", help="ESP32 Device ID")
    
    args = parser.parse_args()
    run_simulator(args)

if __name__ == "__main__":
    main()
