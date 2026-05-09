import api from '../lib/api';

export const adminService = {
  async getSummary() {
    const response = await api.get('/admin/summary');
    return response.data;
  },

  async getOrganizations() {
    const response = await api.get('/admin/organizations');
    return response.data;
  },

  async getAuditLogs(limit = 60) {
    const response = await api.get('/admin/logs', {
      params: { limit }
    });
    return response.data;
  },

  async getPendingUsers() {
    const response = await api.get('/admin/users/pending');
    return response.data;
  },

  async approveUser(userId) {
    const response = await api.post(`/admin/users/${userId}/approve`);
    return response.data;
  },

  async updateOrganizationBilling(organizationId, payload) {
    const response = await api.put(`/admin/organizations/${organizationId}/billing`, payload);
    return response.data;
  }
};
