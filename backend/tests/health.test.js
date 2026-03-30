const request = require('supertest');
const app = require('../src/app');

describe('Health Check Endpoint', () => {
  it('should return 200 status and healthy response', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('status', 'healthy');
    expect(response.body.data).toHaveProperty('timestamp');
    expect(response.body.data).toHaveProperty('version');
  });

  it('should return ISO timestamp format', async () => {
    const response = await request(app)
      .get('/api/health');

    const timestamp = response.body.data.timestamp;
    expect(() => new Date(timestamp)).not.toThrow();
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });
});
