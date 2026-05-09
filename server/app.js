const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const apiRoutes = require('./routes');
const { uploadsRoot } = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { query } = require('./config/database');

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

app.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.status(200).json({ status: 'ok', db: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'degraded', db: 'unreachable' });
  }
});

app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
