import api from '../lib/api';

export const reminderService = {
  async generateReminder(payload) {
    const response = await api.post('/reminders/generate', payload);
    return response.data;
  }
};
