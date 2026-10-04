import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import LiveMonitoring from './pages/LiveMonitoring';
import Trips from './pages/Trips';
import Events from './pages/Events';
import MlAnalytics from './pages/MlAnalytics';
import SystemInfo from './pages/SystemInfo';
import { Activity, Car, AlertTriangle, Brain, Info, LayoutDashboard, Database, RefreshCw } from 'lucide-react';
import { getHealth } from './services/api';

function NavLinks() {
  const location = useLocation();
  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-400' },
    { to: '/live', label: 'Live Monitoring', icon: Activity, color: 'text-emerald-400' },
    { to: '/trips', label: 'Trips', icon: Car, color: 'text-cyan-400' },
    { to: '/events', label: 'Events', icon: AlertTriangle, color: 'text-amber-400' },
    { to: '/ml', label: 'ML Analytics', icon: Brain, color: 'text-purple-400' },
    { to: '/info', label: 'System Info', icon: Info, color: 'text-indigo-400' },
  ];

  return (
    <nav className="flex-1 p-4 space-y-2">
      {links.map(({ to, label, icon: Icon, color }) => {
        const isActive = location.pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${
              isActive
                ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Icon className={`w-5 h-5 ${color}`} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function App() {
  const [systemStatus, setSystemStatus] = useState({
    isOnline: false,
    dbMode: 'checking...',
    lastChecked: null,
    loading: true,
  });

  const checkStatus = async () => {
    try {
      const res = await getHealth();
      if (res.data && res.data.status === 'ok') {
        setSystemStatus({
          isOnline: true,
          dbMode: res.data.database === 'connected' ? 'MongoDB' : 'Development Mode',
          lastChecked: new Date(),
          loading: false,
        });
      } else {
        setSystemStatus({
          isOnline: false,
          dbMode: 'offline',
          lastChecked: new Date(),
          loading: false,
        });
      }
    } catch (err) {
      setSystemStatus({
        isOnline: false,
        dbMode: 'offline',
        lastChecked: new Date(),
        loading: false,
      });
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <div className="flex h-screen bg-slate-50 font-sans antialiased text-slate-800">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 select-none">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h1 className="text-lg font-bold flex items-center gap-2.5 tracking-tight">
              <span className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
                <Car className="w-5 h-5" />
              </span>
              <span>Smart Driver IoT</span>
            </h1>
          </div>

          <NavLinks />

          {/* Quick Architecture indicator at bottom of sidebar */}
          <div className="p-4 m-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1.5">
            <div className="text-slate-400 font-medium">IoT Architecture Pipeline</div>
            <div className="text-slate-500 flex items-center gap-1.5 font-mono">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>Storage: {systemStatus.dbMode}</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-xs">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                IoT-Based Driver Safety & Behavior Monitoring
              </h2>
              <p className="text-xs text-slate-500">
                ESP32 Sensor Telemetry • Real-time Event Detection • Machine Learning
              </p>
            </div>

            {/* REAL Health Status Badge */}
            <div className="flex items-center gap-3">
              {systemStatus.isOnline ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold shadow-xs">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span>🟢 System Online</span>
                  <span className="text-emerald-500 font-normal">|</span>
                  <span className="text-emerald-600 font-medium capitalize">
                    {systemStatus.dbMode}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-semibold shadow-xs">
                  <span className="inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  <span>🔴 Backend Offline</span>
                </div>
              )}

              <button
                onClick={checkStatus}
                title="Refresh Status"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Main Route View */}
          <main className="flex-1 overflow-auto p-6 bg-slate-50/50">
            <Routes>
              <Route path="/" element={<Dashboard isBackendOnline={systemStatus.isOnline} />} />
              <Route path="/live" element={<LiveMonitoring isBackendOnline={systemStatus.isOnline} />} />
              <Route path="/trips" element={<Trips isBackendOnline={systemStatus.isOnline} />} />
              <Route path="/events" element={<Events isBackendOnline={systemStatus.isOnline} />} />
              <Route path="/ml" element={<MlAnalytics isBackendOnline={systemStatus.isOnline} />} />
              <Route path="/info" element={<SystemInfo />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
