require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const Location = require('./models/Location');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

// Geolocation Endpoint
app.post('/api/locate', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Clean up loopback address and detect if local
    if (clientIp === '::1' || clientIp === '127.0.0.1' || clientIp.startsWith('::ffff:127.0.0.1') || clientIp.startsWith('fe80')) {
      try {
        // Fetch server's public IP as fallback for local testing
        const ipifyRes = await axios.get('https://api.ipify.org?format=json');
        clientIp = ipifyRes.data.ip;
      } catch (err) {
        console.warn('Could not fetch server public IP, using fallback test IP (8.8.8.8)');
        clientIp = '8.8.8.8'; // Fallback to Google DNS IP for demo purposes
      }
    }

    // If x-forwarded-for contains a list of IPs, take the first one
    if (clientIp.includes(',')) {
      clientIp = clientIp.split(',')[0].trim();
    }

    let locationDetails = {
      ip: clientIp,
      country: 'Unknown',
      countryCode: '',
      regionName: '',
      city: 'Unknown',
      lat: latitude || null,
      lon: longitude || null,
      isp: 'Unknown',
      timestamp: new Date()
    };

    // If coordinates are provided, perform reverse geocoding via OpenStreetMap Nominatim
    let resolvedByGPS = false;
    if (latitude && longitude) {
      try {
        console.log(`Performing reverse geocoding for Lat: ${latitude}, Lon: ${longitude}`);
        const osmRes = await axios.get('https://nominatim.openstreetmap.org/reverse', {
          params: {
            format: 'json',
            lat: latitude,
            lon: longitude,
            zoom: 10,
            addressdetails: 1
          },
          headers: {
            'User-Agent': 'IP-Locator-App/1.0'
          }
        });

        if (osmRes.data && osmRes.data.address) {
          const address = osmRes.data.address;
          locationDetails.country = address.country || 'Unknown';
          locationDetails.countryCode = address.country_code ? address.country_code.toUpperCase() : '';
          locationDetails.regionName = address.state || address.governorate || '';
          locationDetails.city = address.city || address.town || address.village || address.suburb || address.county || 'Unknown';
          resolvedByGPS = true;
        }
      } catch (osmError) {
        console.error('OSM Nominatim Reverse Geocoding failed, falling back to IP Geolocation:', osmError.message);
      }
    }

    // If we didn't resolve by GPS (or it failed), fallback to IP-based Geolocation
    if (!resolvedByGPS) {
      console.log(`Detecting location via IP-API for IP: ${clientIp}`);
      const geoRes = await axios.get(`http://ip-api.com/json/${clientIp}`);
      const geoData = geoRes.data;

      if (geoData.status !== 'fail') {
        locationDetails.country = geoData.country || locationDetails.country;
        locationDetails.countryCode = geoData.countryCode || locationDetails.countryCode;
        locationDetails.regionName = geoData.regionName || locationDetails.regionName;
        locationDetails.city = geoData.city || locationDetails.city;
        if (!locationDetails.lat) locationDetails.lat = geoData.lat;
        if (!locationDetails.lon) locationDetails.lon = geoData.lon;
        locationDetails.isp = geoData.isp || locationDetails.isp;
      }
    } else {
      // Still attempt to get ISP information based on IP
      try {
        const geoRes = await axios.get(`http://ip-api.com/json/${clientIp}`);
        if (geoRes.data && geoRes.data.status !== 'fail') {
          locationDetails.isp = geoRes.data.isp || 'Unknown';
        }
      } catch (ispError) {
        console.warn('Could not fetch ISP details for IP:', clientIp, ispError.message);
      }
    }

    // 1. Save to MongoDB Database via Mongoose
    const newLocation = new Location(locationDetails);
    await newLocation.save();

    // 2. Save/Append to the local file
    const logPath = process.env.LOG_FILE_PATH || path.join(__dirname, 'locations-detected.json');
    let logEntries = [];

    try {
      const data = await fs.readFile(logPath, 'utf8');
      logEntries = JSON.parse(data);
      if (!Array.isArray(logEntries)) {
        logEntries = [];
      }
    } catch (err) {
      // If file doesn't exist, we start with an empty list
    }

    logEntries.push(locationDetails);

    // Save with indentation for nice formatting
    await fs.writeFile(logPath, JSON.stringify(logEntries, null, 2), 'utf8');
    console.log(`Location transaction recorded in file: ${logPath}`);

    // Respond back to frontend
    res.status(200).json(locationDetails);

  } catch (error) {
    console.error('Error processing location request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
