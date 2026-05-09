import api from '../lib/api';

export const reminderService = {
  async generateReminder(payload) {
    const response = await api.post('/reminders/manual', payload);
    return {
      ...response.data,
      reminderText: response.data.reminderText || response.data.message || ''
    };
  },

  async toggleAutoReminders(enabled) {
    const response = await api.post('/reminders/toggle', { enabled });
    return response.data;
  },

  async updateReminderSettings(payload) {
    const response = await api.post('/reminders/settings', payload);
    return response.data;
  },

  async triggerAllReminders() {
    const response = await api.post('/reminders/trigger-all');
    return response.data;
  }
};
