// Example test with supertest
const request = require('supertest');
const app = require('./server');
const config = require('./shared/config');

describe('Image Upload', () => {
  it('should upload an image', async () => {
    const response = await request(app)
      .post(`${config.app.api.prefix}/${config.app.api.version}/images/upload`)
      .attach('image', 'test-image.jpg')
      .field('imageType', 'poster')
      .expect(201);
    
    expect(response.body.imageUrl).toBeDefined();
    expect(response.body.imageId).toBeDefined();
  });
});
