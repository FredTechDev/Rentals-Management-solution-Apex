const rateLimit = require('express-rate-limit');
const { rateLimit: rateConfig } = require('../config/env');

const apiRateLimiter = rateLimit({
  windowMs: rateConfig.windowMs,
  max: rateConfig.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});

module.exports = {
  apiRateLimiter
};
