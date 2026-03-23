import api from '../lib/api';

export const leaseService = {
  async getTenantLease() {
    const response = await api.get('/leases/tenant');
    return response.data;
  },

  async getManagementLeases() {
    const response = await api.get('/leases/landlord');
    return response.data;
  },

  async uploadLease(formData) {
    const response = await api.post('/leases/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  async fetchLeaseFile(leaseId) {
    const response = await api.get(`/leases/view/${leaseId}`, {
      responseType: 'blob'
    });
    return response.data;
  }
};
