import React from 'react';
import { Cpu, Server, Database, Globe, Activity, CheckCircle, ShieldCheck, Wrench, HardDrive } from 'lucide-react';

export default function SystemInfo() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Title & Overview Card */}
      <div className="bg-white p-8 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
            <Cpu className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Smart Driver IoT
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              IoT-Based Smart Driver Safety and Driving Behavior Monitoring System Using ESP32 and Machine Learning
            </p>
          </div>
        </div>

        {/* Mandatory Architectural Distinction Quote */}
        <div className="p-4 bg-blue-50/80 border-l-4 border-blue-500 rounded-r-xl my-6">
          <p className="text-sm font-medium text-blue-950 leading-relaxed">
            "This prototype supports a hardware-integrated architecture in which ESP32 collects sensor readings from MPU6050 and GPS modules and transmits them through Wi-Fi to the backend. A software simulator is also provided for development and demonstration when physical hardware is unavailable."
          </p>
        </div>

        {/* Architecture Section */}
        <h2 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" />
          <span>End-to-End System Architecture</span>
        </h2>
        <div className="bg-slate-900 text-slate-200 p-5 rounded-xl font-mono text-xs overflow-x-auto my-4 leading-relaxed">
{`┌───────────────────────────────┐
│   ESP32 Microcontroller       │◄── (Or Python IoT Sensor Simulator)
│   • MPU6050 (Accel + Gyro)    │
│   • NEO-6M GPS Module         │
│   • Alert Buzzer & Status LED │
└───────────────┬───────────────┘
                │ Wi-Fi / HTTP POST
                ▼
┌───────────────────────────────┐
│   FastAPI Backend Service     │
│   • Sensor Ingestion API      │
│   • Rule-Based Event Detector │
│   • Safety Score Engine       │
│   • Random Forest Classifier  │
└───────────────┬───────────────┘
                │ Storage Abstraction Layer
                ▼
┌───────────────────────────────┐
│   Database Layer              │
│   • MongoDB (Primary)         │
│   • SQLite (Dev-Mode Fallback)│
└───────────────┬───────────────┘
                │ Polling / REST
                ▼
┌───────────────────────────────┐
│   React Dashboard (Vite)      │
│   • Live Telemetry & GPS Map  │
│   • Historical Trips Explorer │
│   • Filterable Events Log     │
│   • ML Analytics & Confusion  │
└───────────────────────────────┘`}
        </div>

        {/* Hardware Stack */}
        <h2 className="text-lg font-bold text-slate-900 mt-8 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-emerald-500" />
          <span>Hardware Subsystem (ESP32 Integration)</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>ESP32-WROOM-32</span>
            </h4>
            <p className="text-xs text-slate-600 mt-1">
              Dual-core 240MHz microcontroller with built-in 802.11 b/g/n Wi-Fi for telemetry streaming.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>MPU6050 IMU Module</span>
            </h4>
            <p className="text-xs text-slate-600 mt-1">
              3-Axis Accelerometer (±8g) + 3-Axis Gyroscope (±1000°/s) connected via I2C (SDA 21, SCL 22).
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>NEO-6M GPS Module</span>
            </h4>
            <p className="text-xs text-slate-600 mt-1">
              High sensitivity GPS receiver outputting NMEA sentences via Hardware UART2 (RX 16, TX 17).
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Active Buzzer & Alert LED</span>
            </h4>
            <p className="text-xs text-slate-600 mt-1">
              In-cabin auditory and visual warning signals triggered on high-severity events (GPIO 25 & 26).
            </p>
          </div>
        </div>

        {/* Software Stack */}
        <h2 className="text-lg font-bold text-slate-900 mt-8 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
          <Server className="w-5 h-5 text-purple-500" />
          <span>Software & Data Science Stack</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-semibold text-sm text-slate-800">FastAPI & Python 3</h4>
            <p className="text-xs text-slate-600 mt-1">
              Asynchronous high-performance REST backend with automatic OpenAPI documentation and CORS support.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-semibold text-sm text-slate-800">React 19 & Tailwind CSS</h4>
            <p className="text-xs text-slate-600 mt-1">
              Vite-powered single-page application with Leaflet OpenStreetMap navigation and Recharts telemetry graphs.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-semibold text-sm text-slate-800">MongoDB + SQLite Fallback</h4>
            <p className="text-xs text-slate-600 mt-1">
              Persistent storage repository supporting production MongoDB or self-contained SQLite development storage.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-semibold text-sm text-slate-800">Scikit-learn ML Pipeline</h4>
            <p className="text-xs text-slate-600 mt-1">
              Random Forest Classifier with 10 motion features determining driving safety category.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
