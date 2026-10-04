#!/usr/bin/env python3
"""
Smart Driver IoT - One-Command Master Demo Runner
Starts Backend, Frontend, and IoT Sensor Simulator with live streaming.
"""

import subprocess
import time
import os
import sys
import socket

def is_port_in_use(port, host='localhost'):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0

def find_python():
    venv_py = os.path.abspath(os.path.join("venv", "Scripts", "python.exe") if os.name == 'nt' else os.path.join("venv", "bin", "python"))
    if os.path.exists(venv_py):
        return venv_py
    return sys.executable

def main():
    print("=" * 70)
    print("      SMART DRIVER IoT - END-TO-END DEMO ENVIRONMENT")
    print("=" * 70)
    
    python_exec = find_python()
    processes = []
    
    # 1. Start Backend if not already running
    if is_port_in_use(8000):
        print("[✓] Backend is already running on port 8000.")
    else:
        print("[*] Starting FastAPI Backend server on port 8000...")
        backend_proc = subprocess.Popen(
            [python_exec, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
            cwd="backend"
        )
        processes.append(backend_proc)
        # Wait for backend to bind port
        for _ in range(10):
            if is_port_in_use(8000):
                break
            time.sleep(0.5)
        print("[✓] Backend online at http://localhost:8000")

    # 2. Start Frontend if not already running
    if is_port_in_use(5173):
        print("[✓] Frontend Vite server is already running on port 5173.")
    else:
        print("[*] Starting React Vite Dashboard on port 5173...")
        frontend_proc = subprocess.Popen(
            "npm run dev",
            cwd="frontend",
            shell=True
        )
        processes.append(frontend_proc)
        time.sleep(2)
        print("[✓] Frontend online at http://localhost:5173")

    # 3. Start IoT Sensor Simulator in continuous mode (Scenario: Normal/Risky to show events)
    scenario = "risky" if "--risky" in sys.argv else ("safe" if "--safe" in sys.argv else "normal")
    print(f"[*] Starting IoT Sensor Simulator (Scenario: {scenario.upper()})...")
    sim_proc = subprocess.Popen(
        [python_exec, os.path.join("iot_simulator", "sensor_simulator.py"), "--scenario", scenario, "--interval", "1.0"]
    )
    processes.append(sim_proc)

    print("\n" + "=" * 70)
    print("             ALL SYSTEMS OPERATIONAL & STREAMING")
    print("=" * 70)
    print("  ► React Dashboard:   http://localhost:5173")
    print("  ► Live Telemetry:    http://localhost:5173/live")
    print("  ► Backend Health:    http://localhost:8000/api/health")
    print("  ► OpenAPI Docs:      http://localhost:8000/docs")
    print("=" * 70)
    print("Press Ctrl+C at any time to gracefully terminate all services.\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[*] Shutting down demo environment...")
        for p in processes:
            try:
                p.terminate()
            except Exception:
                pass
        print("[✓] All demo processes stopped cleanly.")

if __name__ == "__main__":
    main()
