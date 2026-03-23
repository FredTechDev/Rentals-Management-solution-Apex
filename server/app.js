const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const apiRoutes = require('./routes');
const { uploadsRoot } = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

for (const dir of ['leases', 'repairs']) {
  fs.mkdirSync(path.join(uploadsRoot, dir), { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsRoot));

app.get('/', (req, res) => {
  res.send('Apex Agencies Backend API is running...');
});

app.get('/health', (req, res) => {
  const isReady = mongoose.connection.readyState === 1;

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ok' : 'degraded',
    mongodbState: mongoose.connection.readyState
  });
});

app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
