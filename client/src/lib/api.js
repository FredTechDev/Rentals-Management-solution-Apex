import axios from 'axios';
import { clearSession, readSession } from './session';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: apiBaseUrl
});

api.interceptors.request.use((config) => {
  const token = readSession()?.token;
  if (token) {
    config.headers.Authorization = config.headers.Authorization || `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (status === 401 || (status === 400 && message === 'Invalid token.')) {
      clearSession();
      window.dispatchEvent(new Event('apex:session-expired'));
    }

    return Promise.reject(error);
  }
);

export const getApiErrorMessage = (error, fallback = 'Something went wrong.') => (
  error.response?.data?.message
  || error.response?.data?.error
  || error.message
  || fallback
);

export const buildApiUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl.replace(/\/$/, '')}${normalizedPath}`;
};

export default api;
