import api from '../lib/api';

export const unitService = {
  async getUnitsByProperty(propertyId) {
    const response = await api.get(`/properties/${propertyId}/units`);
    return response.data;
  },

  async createUnit(payload) {
    const response = await api.post('/units', payload);
    return response.data;
  },

  async updateUnit(unitId, payload) {
    const response = await api.put(`/units/${unitId}`, payload);
    return response.data;
  }
};
