const mongoose = require('mongoose');

const connectDatabase = (uri) => mongoose.connect(uri);

module.exports = {
  mongoose,
  connectDatabase
};
