import axios from 'axios';

export const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('jakdata_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('jakdata_token');
    localStorage.removeItem('jakdata_user');
    window.location.href = '/login';
  }
  return Promise.reject(err);
});