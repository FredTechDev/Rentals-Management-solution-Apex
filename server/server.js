const app = require('./app');
const { connectDatabase } = require('./config/database');
const { runPublicMigrations } = require('./database');
const { port } = require('./config/env');
const { startScheduler } = require('./services/scheduler');

const startServer = async () => {
  try {
    await connectDatabase();
    await runPublicMigrations();
    console.log('Connected to Postgres');

    startScheduler();

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error('Could not connect to Postgres', err);
    process.exit(1);
  }
};

startServer();
