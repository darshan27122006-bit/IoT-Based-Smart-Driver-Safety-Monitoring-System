import { useState, useEffect, useRef } from 'react';
import { getDashboardLive, getEvents } from '../services/api';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Activity, Shield, AlertTriangle, Navigation, Gauge, Cpu } from 'lucide-react';

// Fix Leaflet marker icon asset paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to smoothly center map on new vehicle coordinates
function MapAutoCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function LiveMonitoring({ isBackendOnline }) {
  const [telemetry, setTelemetry] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [trail, setTrail] = useState([]);
  const [error, setError] = useState(null);

  const fetchLive = async () => {
    try {
      const res = await getDashboardLive();
      if (res.data) {
        setTelemetry(res.data);
        setError(null);
        if (res.data.has_data && res.data.latitude && res.data.longitude) {
          setTrail(prev => {
            const next = [...prev, [res.data.latitude, res.data.longitude]];
            // Keep last 40 points for the vehicle route trail
            return next.slice(-40);
          });
        }
      }
    } catch (err) {
      console.error("Live telemetry polling error:", err);
      setError("Cannot reach live telemetry endpoint.");
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await getEvents({ limit: 5 });
      if (res.data) setRecentEvents(res.data);
    } catch (e) {
      // Non-critical
    }
  };

  useEffect(() => {
    fetchLive();
    fetchEvents();
    const interval = setInterval(() => {
      fetchLive();
      fetchEvents();
    }, 1500); // Poll every 1.5 seconds

    return () => clearInterval(interval);
  }, []);

  const hasData = telemetry?.has_data;
  const currentPos = hasData && telemetry.latitude && telemetry.longitude
    ? [telemetry.latitude, telemetry.longitude]
    : [13.0827, 80.2707]; // Default Chennai center

  return (
    <div className="space-y-6">
      {/* Live Header Status */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3.5 w-3.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${hasData ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${hasData ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          <h2 className="text-xl font-bold text-slate-800">Live Telemetry & GPS Tracking</h2>
          {hasData && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
              Trip: {telemetry.trip_id || 'TRIP001'} | Driver: {telemetry.driver_id || 'DRV001'}
            </span>
          )}
        </div>

        {/* Real-time Classification & Score Badge */}
        {hasData && (
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              telemetry.classification === 'SAFE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
              telemetry.classification === 'MODERATE' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
              'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
            }`}>
              <Shield className="w-3.5 h-3.5" />
              <span>Status: {telemetry.classification}</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 text-xs font-bold">
              Score: {telemetry.safety_score}/100
            </div>
          </div>
        )}
      </div>

      {/* Latest Event Banner if active */}
      {hasData && telemetry.latest_event && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 animate-bounce" />
          <div>
            <span className="font-semibold">Recent Event Detected:</span> {telemetry.latest_event}
          </div>
        </div>
      )}

      {/* Main Grid: Map & Sensor Telemetry Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live GPS Map (2 Cols) */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-500" />
              <span>Live Vehicle Position & Route Trail</span>
            </h3>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
              Simulated coordinates (Chennai Metro Corridor)
            </span>
          </div>

          <div className="h-96 w-full rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100">
            {hasData ? (
              <MapContainer
                center={currentPos}
                zoom={14}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <MapAutoCenter center={currentPos} />
                
                {/* Vehicle Breadcrumb Route Trail */}
                {trail.length > 1 && (
                  <Polyline positions={trail} color="#3b82f6" weight={4} opacity={0.7} />
                )}

                {/* Current Vehicle Position */}
                <Marker position={currentPos}>
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-slate-800">Vehicle ESP32-001</p>
                      <p>Speed: {telemetry.speed} km/h</p>
                      <p>Score: {telemetry.safety_score}/100</p>
                      <p className="font-mono text-slate-500">
                        Lat: {telemetry.latitude?.toFixed(4)}, Lon: {telemetry.longitude?.toFixed(4)}
                      </p>
                    </div>
                  </Popup>
                </Marker>

                {/* Event Markers along route */}
                {recentEvents.map(evt => (
                  <Marker
                    key={evt._id || evt.event_id}
                    position={[evt.latitude, evt.longitude]}
                  >
                    <Popup>
                      <div className="text-xs">
                        <p className="font-bold text-rose-600">{evt.event_type}</p>
                        <p>Severity: {evt.severity}</p>
                        <p>Time: {new Date(evt.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-3">
                <Navigation className="w-10 h-10 text-slate-300 animate-pulse" />
                <div>
                  <p className="text-base font-medium text-slate-600">Waiting for sensor data...</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Start the IoT Simulator or connect your ESP32 hardware to stream live GPS and motion telemetry.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>GPS Fix: {hasData ? 'Active (Lock)' : 'Searching...'}</span>
            <span>
              Coordinates: {hasData ? `${telemetry.latitude?.toFixed(5)}° N, ${telemetry.longitude?.toFixed(5)}° E` : '--'}
            </span>
          </div>
        </div>

        {/* Telemetry Sensor Panels (1 Col) */}
        <div className="space-y-4">
          {/* Speed Card */}
          <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-blue-500" />
                <span>Vehicle Speed</span>
              </h4>
              <span className="text-xs text-slate-400">Limit: 60 km/h</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {hasData ? telemetry.speed : '--'}
              </p>
              <span className="text-slate-500 font-medium">km/h</span>
            </div>
            {hasData && (
              <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    telemetry.speed > 80 ? 'bg-rose-500' :
                    telemetry.speed > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (telemetry.speed / 120) * 100)}%` }}
                ></div>
              </div>
            )}
          </div>

          {/* MPU6050 Accelerometer */}
          <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>MPU6050 Acceleration (m/s²)</span>
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <p className="text-2xs font-semibold text-slate-400 uppercase">Forward (X)</p>
                <p className={`text-lg font-bold mt-0.5 ${
                  hasData && (telemetry.acceleration.x < -4.0 || telemetry.acceleration.x > 4.0)
                    ? 'text-rose-600 font-black'
                    : 'text-slate-800'
                }`}>
                  {hasData ? (telemetry.acceleration.x > 0 ? `+${telemetry.acceleration.x}` : telemetry.acceleration.x) : '--'}
                </p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <p className="text-2xs font-semibold text-slate-400 uppercase">Lateral (Y)</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {hasData ? telemetry.acceleration.y : '--'}
                </p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <p className="text-2xs font-semibold text-slate-400 uppercase">Vertical (Z)</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {hasData ? telemetry.acceleration.z : '--'}
                </p>
              </div>
            </div>
            <p className="text-2xs text-slate-400 mt-2 text-right">Z ≈ 9.8 m/s² (Earth gravity)</p>
          </div>

          {/* MPU6050 Gyroscope */}
          <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-500" />
              <span>MPU6050 Gyroscope (rad/s)</span>
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <p className="text-2xs font-semibold text-slate-400 uppercase">Roll (X)</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {hasData ? telemetry.gyroscope.x : '--'}
                </p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <p className="text-2xs font-semibold text-slate-400 uppercase">Pitch (Y)</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {hasData ? telemetry.gyroscope.y : '--'}
                </p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <p className="text-2xs font-semibold text-slate-400 uppercase">Yaw (Z)</p>
                <p className={`text-lg font-bold mt-0.5 ${
                  hasData && Math.abs(telemetry.gyroscope.z) > 3.0 ? 'text-rose-600 font-black' : 'text-slate-800'
                }`}>
                  {hasData ? telemetry.gyroscope.z : '--'}
                </p>
              </div>
            </div>
            <p className="text-2xs text-slate-400 mt-2 text-right">Yaw Threshold: ±3.0 rad/s</p>
          </div>
        </div>
      </div>
    </div>
  );
}
