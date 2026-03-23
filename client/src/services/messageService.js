import api from '../lib/api';

export const messageService = {
  async getMessages() {
    const response = await api.get('/messages');
    return response.data;
  },

  async sendMessage(payload) {
    const response = await api.post('/messages', payload);
    return response.data;
  }
};
