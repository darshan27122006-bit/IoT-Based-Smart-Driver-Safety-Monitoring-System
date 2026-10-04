import { useState, useEffect } from 'react';
import { getEvents } from '../services/api';
import { AlertTriangle, Filter, RotateCcw } from 'lucide-react';

export default function Events({ isBackendOnline }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [tripFilter, setTripFilter] = useState('');

  const fetchEvents = async () => {
    try {
      const filters = {};
      if (eventTypeFilter) filters.event_type = eventTypeFilter;
      if (severityFilter) filters.severity = severityFilter;
      if (driverFilter) filters.driver_id = driverFilter;
      if (tripFilter) filters.trip_id = tripFilter;
      filters.limit = 100;

      const res = await getEvents(filters);
      setEvents(res.data || []);
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 2500);
    return () => clearInterval(interval);
  }, [eventTypeFilter, severityFilter, driverFilter, tripFilter]);

  const handleResetFilters = () => {
    setEventTypeFilter('');
    setSeverityFilter('');
    setDriverFilter('');
    setTripFilter('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Detected Driving Behavior Events</h2>
          <p className="text-xs text-slate-500">Live safety events identified by rule-based sensor thresholding algorithms</p>
        </div>
        <span className="text-xs font-mono text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          Showing: {events.length} events
        </span>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mr-2">
          <Filter className="w-4 h-4 text-blue-500" />
          <span>Filters:</span>
        </div>

        {/* Event Type Filter */}
        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Event Types</option>
          <option value="OVERSPEED">Overspeed</option>
          <option value="HARSH_BRAKING">Harsh Braking</option>
          <option value="SUDDEN_ACCELERATION">Sudden Acceleration</option>
          <option value="SHARP_TURN">Sharp Turn</option>
          <option value="ABNORMAL_BEHAVIOR">Abnormal Behavior</option>
        </select>

        {/* Severity Filter */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Severities</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
        </select>

        {/* Driver Filter */}
        <input
          type="text"
          placeholder="Filter by Driver (e.g. DRV001)"
          value={driverFilter}
          onChange={(e) => setDriverFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-48"
        />

        {/* Trip Filter */}
        <input
          type="text"
          placeholder="Filter by Trip ID"
          value={tripFilter}
          onChange={(e) => setTripFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-36"
        />

        {/* Reset Button */}
        {(eventTypeFilter || severityFilter || driverFilter || tripFilter) && (
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Time</th>
                <th className="px-5 py-3.5 font-semibold">Driver</th>
                <th className="px-5 py-3.5 font-semibold">Trip ID</th>
                <th className="px-5 py-3.5 font-semibold">Event</th>
                <th className="px-5 py-3.5 font-semibold">Severity</th>
                <th className="px-5 py-3.5 font-semibold">Speed</th>
                <th className="px-5 py-3.5 font-semibold">Acceleration</th>
                <th className="px-5 py-3.5 font-semibold">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {events.map((evt, idx) => {
                const sv = evt.sensor_values || {};
                const accelVal = sv.acceleration_x !== undefined ? `${sv.acceleration_x} m/s²` : '--';
                const speedVal = evt.speed_kmh ? `${Math.round(evt.speed_kmh)} km/h` : (sv.speed_kmh ? `${Math.round(sv.speed_kmh)} km/h` : '--');
                const locVal = (evt.latitude && evt.longitude) ? `${evt.latitude.toFixed(4)}, ${evt.longitude.toFixed(4)}` : '--';

                return (
                  <tr key={evt._id || evt.event_id || idx} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5 text-xs font-mono text-slate-500">
                      {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : '--'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">{evt.driver_id || 'DRV001'}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-blue-600 font-medium">{evt.trip_id}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <span>{evt.event_type}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        evt.severity === 'LOW' ? 'bg-amber-100 text-amber-800' :
                        evt.severity === 'MEDIUM' ? 'bg-orange-100 text-orange-800' :
                        'bg-rose-100 text-rose-800 animate-pulse'
                      }`}>
                        {evt.severity}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-800 font-mono text-xs">{speedVal}</td>
                    <td className="px-5 py-3.5 text-slate-800 font-mono text-xs">{accelVal}</td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{locVal}</td>
                  </tr>
                );
              })}
              {events.length === 0 && !loading && (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                    No matching events found. Drive riskily in the simulator (<code className="font-mono text-slate-600 bg-slate-100 px-1 py-0.5 rounded">--scenario risky</code>) to trigger events!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
