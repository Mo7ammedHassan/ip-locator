const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true
  },
  country: {
    type: String,
    default: 'Unknown'
  },
  countryCode: {
    type: String,
    default: ''
  },
  regionName: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    default: 'Unknown'
  },
  lat: {
    type: Number
  },
  lon: {
    type: Number
  },
  isp: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Location', LocationSchema);
