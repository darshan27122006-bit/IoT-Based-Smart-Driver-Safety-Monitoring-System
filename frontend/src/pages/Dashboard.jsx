import { useState, useEffect } from 'react';
import { getDashboardSummary } from '../services/api';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Activity, AlertTriangle, ShieldCheck, Car, Gauge, Zap, AlertCircle } from 'lucide-react';

const PIE_COLORS = {
  SAFE: '#10b981',
  MODERATE: '#f59e0b',
  RISKY: '#ef4444'
};

export default function Dashboard({ isBackendOnline }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const res = await getDashboardSummary();
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError('Failed to fetch dashboard data. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-72 text-slate-500 gap-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-medium text-sm">Loading dashboard telemetry...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800 space-y-3">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-rose-600" />
          <h3 className="font-semibold text-lg">Backend Connection Error</h3>
        </div>
        <p className="text-sm text-rose-700">{error}</p>
        <div className="text-xs bg-white/70 p-3 rounded-lg border border-rose-200 font-mono">
          Expected URL: http://localhost:8000/api/dashboard/summary
        </div>
      </div>
    );
  }

  const latestSensor = data?.latest_sensor;
  const latestTrip = data?.latest_trip;
  const hasSensorData = Boolean(latestSensor);

  // Event breakdowns
  const eventCounts = data?.events_breakdown || {};
  const harshBrakingCount = eventCounts['HARSH_BRAKING'] || eventCounts['Harsh Braking'] || 0;
  const suddenAccelCount = eventCounts['SUDDEN_ACCELERATION'] || eventCounts['Sudden Acceleration'] || 0;
  const overspeedCount = eventCounts['OVERSPEED'] || eventCounts['Overspeeding'] || 0;
  const sharpTurnCount = eventCounts['SHARP_TURN'] || eventCounts['Sharp Turn'] || 0;

  // Chart: Events Breakdown
  const eventChartData = Object.entries(eventCounts).map(([name, count]) => ({
    name: name.replace('_', ' '),
    count
  }));

  // Chart: Recent Speed & Acceleration History
  const historyData = (data?.recent_history || []).map((pt, idx) => ({
    time: pt.timestamp ? new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : `#${idx}`,
    speed: Math.round(pt.speed_kmh || 0),
    accel: Number((pt.acceleration_x || 0).toFixed(2))
  }));

  // Chart: Classification Distribution
  const dist = data?.classification_distribution || {};
  const pieData = Object.entries(dist)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({ name: key, value }));

  return (
    <div className="space-y-6">
      {/* Top Banner if no data has been received yet */}
      {!hasSensorData && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">No sensor data available</p>
              <p className="text-xs text-amber-700">
                Start the IoT Simulator (<code className="bg-amber-100 px-1 py-0.5 rounded font-mono">python iot_simulator/sensor_simulator.py --scenario normal</code>) or power on the ESP32.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Safety Score */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Overall Safety Score</p>
            <p className="text-2xl font-bold text-slate-800">
              {latestTrip ? Math.round(latestTrip.safety_score) : (hasSensorData ? 100 : '--')}
              <span className="text-sm font-normal text-slate-500"> / 100</span>
            </p>
          </div>
        </div>

        {/* Current Speed */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Current Speed</p>
            <p className="text-2xl font-bold text-slate-800">
              {hasSensorData ? Math.round(latestSensor.speed_kmh) : '--'}
              <span className="text-sm font-normal text-slate-500"> km/h</span>
            </p>
          </div>
        </div>

        {/* Driver Classification */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Driver Classification</p>
            <p className="text-xl font-bold">
              {latestTrip ? (
                <span className={
                  latestTrip.classification === 'SAFE' ? 'text-emerald-600' :
                  latestTrip.classification === 'MODERATE' ? 'text-amber-600' : 'text-rose-600'
                }>
                  {latestTrip.classification}
                </span>
              ) : (
                <span className="text-slate-400">--</span>
              )}
            </p>
          </div>
        </div>

        {/* Total Trips & Events */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Trips & Events</p>
            <p className="text-2xl font-bold text-slate-800">
              {data?.total_trips || 0}
              <span className="text-sm font-normal text-slate-500"> trips / {data?.total_events || 0} evts</span>
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Specific Event Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
          <p className="text-xs text-slate-400 font-medium">Overspeed Events</p>
          <p className="text-xl font-bold text-rose-600 mt-1">{overspeedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
          <p className="text-xs text-slate-400 font-medium">Harsh Braking</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{harshBrakingCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
          <p className="text-xs text-slate-400 font-medium">Sudden Acceleration</p>
          <p className="text-xl font-bold text-orange-600 mt-1">{suddenAccelCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
          <p className="text-xs text-slate-400 font-medium">Sharp Turns</p>
          <p className="text-xl font-bold text-indigo-600 mt-1">{sharpTurnCount}</p>
        </div>
      </div>

      {/* Telemetry Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Speed vs Time */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center justify-between">
            <span>Speed Telemetry vs Time</span>
            <span className="text-xs font-normal text-slate-500">Speed Limit: 60 km/h</span>
          </h3>
          <div className="h-64">
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="speed" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} name="Speed (km/h)" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No telemetry points recorded yet
              </div>
            )}
          </div>
        </div>

        {/* Acceleration vs Time */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center justify-between">
            <span>Forward Acceleration vs Time</span>
            <span className="text-xs font-normal text-slate-500">Threshold: ±4.0 m/s²</span>
          </h3>
          <div className="h-64">
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis domain={[-8, 8]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="accel" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} name="Accel X (m/s²)" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No telemetry points recorded yet
              </div>
            )}
          </div>
        </div>

        {/* Events by Type */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Detected Safety Events by Type</h3>
          <div className="h-64">
            {eventChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Events Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No driving events detected yet
              </div>
            )}
          </div>
        </div>

        {/* Classification Distribution */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Driving Classification Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-sm">No trip classifications recorded yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
