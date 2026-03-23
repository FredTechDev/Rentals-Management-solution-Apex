import api from '../lib/api';

export const authService = {
  async login(payload) {
    const response = await api.post('/auth/login', payload);
    return response.data;
  },

  async register(payload) {
    const response = await api.post('/auth/register', payload);
    return response.data;
  },

  async getAvailableProperties() {
    const response = await api.get('/auth/properties/available');
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data.user;
  }
};
