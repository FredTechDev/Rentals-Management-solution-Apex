import api from '../lib/api';

export const billingService = {
  async getMyBilling() {
    const response = await api.get('/billing/my-billing');
    return response.data;
  },

  async paySubscription() {
    const response = await api.post('/billing/pay-subscription');
    return response.data;
  }
};
