import api from '../lib/api';

export const paymentService = {
  async getPayments() {
    const response = await api.get('/payments');
    return response.data;
  },

  async initiateStkPush(payload) {
    const response = await api.post('/payments/stkpush', payload);
    return response.data;
  }
};
