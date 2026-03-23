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
  }
};
