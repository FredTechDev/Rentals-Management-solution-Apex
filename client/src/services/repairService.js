import api from '../lib/api';

export const repairService = {
  async getRepairs() {
    const response = await api.get('/repairs');
    return response.data;
  },

  async createRepair(formData) {
    const response = await api.post('/repairs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  async updateRepair(id, payload) {
    const response = await api.put(`/repairs/${id}`, payload);
    return response.data;
  }
};
