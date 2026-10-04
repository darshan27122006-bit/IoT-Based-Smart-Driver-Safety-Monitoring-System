import { useState, useEffect } from 'react';
import { getTrips, getTripDetails } from '../services/api';
import { Car, Shield, X, MapPin, Gauge, Activity, Brain, Clock, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function Trips({ isBackendOnline }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [tripDetail, setTripDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchTrips = async () => {
    try {
      const res = await getTrips(25);
      setTrips(res.data || []);
    } catch (err) {
      console.error("Failed to fetch trips:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
    const interval = setInterval(fetchTrips, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenTrip = async (tripId) => {
    setSelectedTripId(tripId);
    setDetailLoading(true);
    try {
      const res = await getTripDetails(tripId);
      setTripDetail(res.data);
    } catch (err) {
      console.error("Failed to load trip details:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedTripId(null);
    setTripDetail(null);
  };

  const sensorPoints = tripDetail?.sensors || [];
  const routePositions = sensorPoints
    .filter(s => s.latitude && s.longitude)
    .map(s => [s.latitude, s.longitude]);

  const mapCenter = routePositions.length > 0 ? routePositions[0] : [13.0827, 80.2707];

  const chartData = sensorPoints.map((s, idx) => ({
    time: s.timestamp ? new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : `#${idx}`,
    speed: Math.round(s.speed_kmh || 0),
    accel: Number((s.acceleration_x || 0).toFixed(2))
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Trip History & Driving Logs</h2>
          <p className="text-xs text-slate-500">Select any trip to inspect trajectory, sensor graphs, events, and ML diagnosis</p>
        </div>
        <span className="text-xs font-mono text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          Total Trips: {trips.length}
        </span>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Trip ID</th>
                <th className="px-6 py-3.5 font-semibold">Driver</th>
                <th className="px-6 py-3.5 font-semibold">Start Time</th>
                <th className="px-6 py-3.5 font-semibold">End Time</th>
                <th className="px-6 py-3.5 font-semibold">Max Speed</th>
                <th className="px-6 py-3.5 font-semibold">Events</th>
                <th className="px-6 py-3.5 font-semibold">Safety Score</th>
                <th className="px-6 py-3.5 font-semibold">Classification</th>
                <th className="px-4 py-3.5 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {trips.map(trip => (
                <tr
                  key={trip._id || trip.trip_id}
                  onClick={() => handleOpenTrip(trip.trip_id)}
                  className="hover:bg-blue-50/50 cursor-pointer transition"
                >
                  <td className="px-6 py-4 font-mono font-medium text-blue-600 flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-slate-400" />
                    <span>{trip.trip_id}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium">{trip.driver_id || 'DRV001'}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {trip.start_time ? new Date(trip.start_time).toLocaleTimeString() : '--'}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {trip.end_time ? new Date(trip.end_time).toLocaleTimeString() : '--'}
                  </td>
                  <td className="px-6 py-4 text-slate-800 font-semibold">
                    {Math.round(trip.max_speed || 0)} <span className="text-xs font-normal text-slate-400">km/h</span>
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      (trip.event_count || 0) > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {trip.event_count || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800">
                    {Math.round(trip.safety_score ?? 100)} / 100
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      trip.classification === 'SAFE' ? 'bg-emerald-100 text-emerald-800' :
                      trip.classification === 'MODERATE' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {trip.classification || 'SAFE'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenTrip(trip.trip_id); }}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg text-slate-600 font-medium transition flex items-center gap-1 mx-auto"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {trips.length === 0 && !loading && (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-slate-400">
                    No trips recorded yet. Run the IoT simulator or connect ESP32 to log trips.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trip Details Modal */}
      {selectedTripId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Trip Details: {selectedTripId}</h3>
                  <p className="text-xs text-slate-500">
                    Driver: {tripDetail?.trip?.driver_id || 'DRV001'} • Recorded Telemetry: {sensorPoints.length} points
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseDetail}
                className="p-2 hover:bg-slate-200 text-slate-500 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {detailLoading ? (
                <div className="flex items-center justify-center h-64 text-slate-500">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500 font-medium">Safety Score</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">
                        {Math.round(tripDetail?.trip?.safety_score ?? 100)} / 100
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500 font-medium">Max Speed</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">
                        {Math.round(tripDetail?.trip?.max_speed ?? 0)} <span className="text-xs text-slate-500 font-normal">km/h</span>
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500 font-medium">Events Logged</p>
                      <p className="text-2xl font-bold text-rose-600 mt-1">
                        {tripDetail?.events?.length || 0}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500 font-medium">ML Behavior Diagnosis</p>
                      <p className="text-lg font-bold text-purple-700 mt-1">
                        {tripDetail?.ml_prediction?.prediction || tripDetail?.trip?.classification || 'SAFE'}
                      </p>
                    </div>
                  </div>

                  {/* Route Map */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span>Trip Route Trajectory</span>
                    </h4>
                    <div className="h-64 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                      {routePositions.length > 0 ? (
                        <MapContainer
                          center={mapCenter}
                          zoom={13}
                          style={{ height: "100%", width: "100%" }}
                          scrollWheelZoom={false}
                        >
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <Polyline positions={routePositions} color="#3b82f6" weight={4} />
                          <Marker position={routePositions[0]}>
                            <Popup>Trip Start</Popup>
                          </Marker>
                          {routePositions.length > 1 && (
                            <Marker position={routePositions[routePositions.length - 1]}>
                              <Popup>Trip End / Current</Popup>
                            </Marker>
                          )}
                        </MapContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                          No GPS route points recorded for this trip.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Graphs: Speed and Acceleration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <h4 className="text-xs font-semibold text-slate-700 mb-2">Speed Graph (km/h)</h4>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="speed" stroke="#3b82f6" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <h4 className="text-xs font-semibold text-slate-700 mb-2">Forward Acceleration (m/s²)</h4>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="accel" stroke="#10b981" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Trip Events Table */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-800">Trip Events Detected</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600 font-semibold">
                          <tr>
                            <th className="px-4 py-2.5">Time</th>
                            <th className="px-4 py-2.5">Event Type</th>
                            <th className="px-4 py-2.5">Severity</th>
                            <th className="px-4 py-2.5">Speed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(tripDetail?.events || []).map((ev, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-slate-500 font-mono">
                                {new Date(ev.timestamp).toLocaleTimeString()}
                              </td>
                              <td className="px-4 py-2 font-medium text-slate-800">{ev.event_type}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                                  ev.severity === 'LOW' ? 'bg-amber-100 text-amber-800' :
                                  ev.severity === 'MEDIUM' ? 'bg-orange-100 text-orange-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {ev.severity}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-slate-700 font-mono">
                                {ev.speed_kmh ? `${Math.round(ev.speed_kmh)} km/h` : '--'}
                              </td>
                            </tr>
                          ))}
                          {(!tripDetail?.events || tripDetail.events.length === 0) && (
                            <tr>
                              <td colSpan="4" className="px-4 py-4 text-center text-slate-400">
                                No penalty events detected on this trip. Clean driving!
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
