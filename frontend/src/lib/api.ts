/// <reference types="vite/client" />
import axios from 'axios';
import { AuthStorage } from './auth';

function resolveApiBaseURL(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (!raw) return '/api';
  const base = raw.replace(/\/$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
}

export const api = axios.create({
  baseURL: resolveApiBaseURL(),
  withCredentials: true,
});

api.interceptors.request.use((cfg) => {
  const token = AuthStorage.getToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      AuthStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);
