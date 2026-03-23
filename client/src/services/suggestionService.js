import api from '../lib/api';

export const suggestionService = {
  async getSuggestions() {
    const response = await api.get('/suggestions');
    return response.data;
  },

  async createSuggestion(payload) {
    const response = await api.post('/suggestions', payload);
    return response.data;
  }
};
