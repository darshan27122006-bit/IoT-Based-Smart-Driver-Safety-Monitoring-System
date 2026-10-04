import axios from 'axios';

// Centralized API Base URL configuration
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const API_BASE_URL = BASE_URL.replace(/\/+$/, '');

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// System Health Check
export const getHealth = () => apiClient.get('/health');

// Dashboard & Telemetry
export const getDashboardSummary = () => apiClient.get('/dashboard/summary');
export const getDashboardLive = () => apiClient.get('/dashboard/live');
export const getLatestSensor = () => apiClient.get('/sensor-data/latest');

// Trips
export const getTrips = (limit = 20) => apiClient.get(`/trips?limit=${limit}`);
export const getTripDetails = (tripId) => apiClient.get(`/trips/${tripId}`);

// Events with filtering
export const getEvents = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.event_type) params.append('event_type', filters.event_type);
  if (filters.severity) params.append('severity', filters.severity);
  if (filters.driver_id) params.append('driver_id', filters.driver_id);
  if (filters.trip_id) params.append('trip_id', filters.trip_id);
  if (filters.limit) params.append('limit', filters.limit);
  return apiClient.get(`/events?${params.toString()}`);
};

// Machine Learning
export const getMlMetrics = () => apiClient.get('/ml/metrics');
export const predictMl = (features) => apiClient.post('/ml/predict', features);

export default apiClient;
