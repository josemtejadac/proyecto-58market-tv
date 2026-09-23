import axios from 'axios';
import { getApiUrl, getToken, clearToken } from '../config';

const client = axios.create();

client.interceptors.request.use((config) => {
  const apiUrl = getApiUrl();
  config.baseURL = `${apiUrl}/api`;

  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearToken();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;
