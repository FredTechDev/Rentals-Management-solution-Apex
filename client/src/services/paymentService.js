import api from '../lib/api';

export const paymentService = {
  async getPayments() {
    const response = await api.get('/payments');
    return response.data;
  },

  async initiateStkPush(payload) {
    const response = await api.post('/payments/stkpush', payload);
    return response.data;
  },

  async getPaymentSettings() {
    const response = await api.get('/payments/settings');
    return response.data;
  },

  async updatePaymentSettings(payload) {
    const response = await api.put('/payments/settings', payload);
    return response.data;
  },

  async getPaymentMethods() {
    const response = await api.get('/payments/methods');
    return response.data;
  }
};
