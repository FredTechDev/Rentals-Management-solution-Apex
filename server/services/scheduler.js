const { runAutoReminders } = require('./reminderService');
const { checkAndGenerateBills } = require('./billingService');

const startScheduler = () => {
  console.log('Scheduler initialized.');
  
  // Run reminders and billing check once every 24 hours
  const interval = 24 * 60 * 60 * 1000;
  
  // Initial run after startup
  setTimeout(() => {
    runAutoReminders();
    checkAndGenerateBills();
  }, 60000);

  setInterval(() => {
    runAutoReminders();
    checkAndGenerateBills();
  }, interval);
};

module.exports = { startScheduler };
