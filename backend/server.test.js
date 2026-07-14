// Mock fs, mongoose, and axios before requiring server
jest.mock('fs', () => {
  return {
    promises: {
      readFile: jest.fn(),
      writeFile: jest.fn().mockResolvedValue(true)
    }
  };
});

jest.mock('mongoose', () => {
  const mockSave = jest.fn().mockResolvedValue(true);

  const MockModel = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    this.save = mockSave;
  });

  return {
    connect: jest.fn().mockResolvedValue(true),
    Schema: jest.fn().mockImplementation(() => ({})),
    model: jest.fn().mockReturnValue(MockModel),
    connection: {
      on: jest.fn(),
      once: jest.fn()
    }
  };
});

jest.mock('axios');

const request = require('supertest');
const axios = require('axios');
const fs = require('fs').promises;
const app = require('./server');

describe('IP Geolocation Express Server Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Always mock writeFile to succeed
    fs.writeFile.mockResolvedValue(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: GPS coordinates → reverse geocoding via OpenStreetMap
  // ─────────────────────────────────────────────────────────────────────────
  test('POST /api/locate with GPS coordinates should perform reverse geocoding via OpenStreetMap', async () => {
    // supertest sends from 127.0.0.1 → server calls ipify first
    axios.get
      // 1) ipify – resolves local IP to a public IP
      .mockResolvedValueOnce({ data: { ip: '156.200.100.100' } })
      // 2) OSM Nominatim reverse geocode
      .mockResolvedValueOnce({
        data: {
          address: {
            country: 'Egypt',
            country_code: 'eg',
            state: 'Qena Governorate',
            city: 'Qena'
          }
        }
      })
      // 3) ISP lookup (runs in the else-if resolvedByGPS branch)
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          isp: 'Telecom Egypt'
        }
      });

    // file doesn't exist yet
    fs.readFile.mockRejectedValueOnce({ code: 'ENOENT' });

    const response = await request(app)
      .post('/api/locate')
      .send({ latitude: 26.1551, longitude: 32.7160 });

    expect(response.statusCode).toBe(200);
    expect(response.body.city).toBe('Qena');
    expect(response.body.country).toBe('Egypt');
    expect(response.body.countryCode).toBe('EG');
    expect(response.body.regionName).toBe('Qena Governorate');
    expect(response.body.isp).toBe('Telecom Egypt');
    expect(response.body.lat).toBe(26.1551);
    expect(response.body.lon).toBe(32.7160);
    expect(fs.writeFile).toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: No GPS → fallback to IP Geolocation
  // ─────────────────────────────────────────────────────────────────────────
  test('POST /api/locate with no coordinates should fallback to IP Geolocation', async () => {
    axios.get
      // 1) ipify
      .mockResolvedValueOnce({ data: { ip: '156.200.50.50' } })
      // 2) IP-API geolocation
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          country: 'Egypt',
          countryCode: 'EG',
          regionName: 'Giza',
          city: 'Giza',
          lat: 29.979,
          lon: 31.134,
          isp: 'Orange Egypt'
        }
      });

    fs.readFile.mockRejectedValueOnce({ code: 'ENOENT' });

    const response = await request(app)
      .post('/api/locate')
      .send({});

    expect(response.statusCode).toBe(200);
    expect(response.body.city).toBe('Giza');
    expect(response.body.country).toBe('Egypt');
    expect(response.body.regionName).toBe('Giza');
    expect(response.body.isp).toBe('Orange Egypt');
    expect(response.body.lat).toBe(29.979);
    expect(response.body.lon).toBe(31.134);
    expect(fs.writeFile).toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: Local IP (::1) → server fetches public IP via ipify
  // ─────────────────────────────────────────────────────────────────────────
  test('POST /api/locate should handle local IPs (::1 or 127.0.0.1) by fetching public IP first', async () => {
    axios.get
      // 1) ipify returns the real public IP
      .mockResolvedValueOnce({ data: { ip: '156.200.200.200' } })
      // 2) IP-API geolocation for that public IP
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          country: 'Egypt',
          countryCode: 'EG',
          regionName: 'Cairo',
          city: 'Cairo',
          lat: 30.044,
          lon: 31.235,
          isp: 'Vodafone Egypt'
        }
      });

    fs.readFile.mockRejectedValueOnce({ code: 'ENOENT' });

    const response = await request(app)
      .post('/api/locate')
      .set('x-forwarded-for', '::1')
      .send({});

    expect(response.statusCode).toBe(200);
    expect(response.body.ip).toBe('156.200.200.200');
    expect(response.body.city).toBe('Cairo');
    expect(response.body.country).toBe('Egypt');
    expect(response.body.isp).toBe('Vodafone Egypt');
    expect(fs.writeFile).toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4: External API failures → graceful degradation
  // ─────────────────────────────────────────────────────────────────────────
  test('POST /api/locate handles external API failures gracefully', async () => {
    axios.get
      // 1) ipify – also fails (worst case)
      .mockRejectedValueOnce(new Error('Network Error'))
      // 2) OSM lookup – fails too
      .mockRejectedValueOnce(new Error('Network Error'))
      // 3) IP-API fallback – returns fail status
      .mockResolvedValueOnce({ data: { status: 'fail' } });

    fs.readFile.mockRejectedValueOnce({ code: 'ENOENT' });

    const response = await request(app)
      .post('/api/locate')
      .send({ latitude: 10, longitude: 10 });

    expect(response.statusCode).toBe(200);
    expect(response.body.city).toBe('Unknown');
    expect(response.body.country).toBe('Unknown');
  });
});
