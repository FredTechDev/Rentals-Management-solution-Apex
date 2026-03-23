import api from '../lib/api';

export const propertyService = {
  async getProperties() {
    const response = await api.get('/properties');
    return response.data;
  },

  async createProperty(payload) {
    const response = await api.post('/properties', payload);
    return response.data;
  },

  async updateProperty(propertyId, payload) {
    const response = await api.put(`/properties/${propertyId}`, payload);
    return response.data;
  },

  async getPendingRegistrations() {
    const response = await api.get('/pending-registrations');
    return response.data;
  },

  async approveRegistration(userId, payload) {
    const response = await api.post(`/approve-registration/${userId}`, payload);
    return response.data;
  },

  async rejectRegistration(userId) {
    const response = await api.post(`/reject-registration/${userId}`);
    return response.data;
  },

  async getPropertyTenants(propertyId) {
    const response = await api.get(`/properties/${propertyId}/tenants`);
    return response.data;
  }
};
