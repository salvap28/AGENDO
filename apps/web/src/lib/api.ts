import axios from 'axios';

const normalizePort = (portValue?: string | null) => {
  if (!portValue) return '4000';
  return portValue.replace(/^:/, '');
};

const API_PORT = normalizePort(process.env.NEXT_PUBLIC_API_PORT || '4000');
const DEFAULT_BASE = `http://localhost${API_PORT ? `:${API_PORT}` : ''}`;
const RELATIVE_PROXY_BASE = '/__agendo_api';
const ENV_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const FORCE_DIRECT_CLIENT = process.env.NEXT_PUBLIC_API_FORCE_DIRECT === 'true';

const resolveRuntimeBase = () => {
  if (typeof window !== 'undefined') {
    if (FORCE_DIRECT_CLIENT && ENV_BASE_URL) return ENV_BASE_URL;
    if (ENV_BASE_URL) {
      try {
        const envURL = new URL(ENV_BASE_URL);
        if (envURL.hostname === window.location.hostname) {
          return ENV_BASE_URL;
        }
      } catch {
        return RELATIVE_PROXY_BASE;
      }
    }
    return RELATIVE_PROXY_BASE;
  }
  return ENV_BASE_URL || DEFAULT_BASE;
};

export const API_BASE = resolveRuntimeBase();

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('agendo_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
