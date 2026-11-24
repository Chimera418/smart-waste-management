import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('swm_p3_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
