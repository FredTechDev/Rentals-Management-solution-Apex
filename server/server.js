const app = require('./app');
const { connectDatabase } = require('./config/database');
const { mongodbUri, port } = require('./config/env');

const startServer = async () => {
  try {
    await connectDatabase(mongodbUri);
    console.log('Connected to MongoDB');

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error('Could not connect to MongoDB', err);
    process.exit(1);
  }
};

startServer();
