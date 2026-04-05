// Example test with supertest
const request = require('supertest');
const app = require('./server');

describe('Image Upload', () => {
  it('should upload an image', async () => {
    const response = await request(app)
      .post('/api/v1/images/upload') // TODO: /api and v1 from config
      .attach('image', 'test-image.jpg')
      .field('imageType', 'poster')
      .expect(201);
    
    expect(response.body.imageUrl).toBeDefined();
    expect(response.body.imageId).toBeDefined();
  });
});
