const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const rootDir = path.join(__dirname, '..');

module.exports = {
  rootDir,
  uploadsRoot: path.join(rootDir, 'uploads'),
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/apex_rentals',
  jwtSecret: process.env.JWT_SECRET || 'local-dev-jwt-secret'
};
