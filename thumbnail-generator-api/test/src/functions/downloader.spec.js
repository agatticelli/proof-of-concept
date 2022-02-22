const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { handle } = require('../../../src/functions/downloader');

jest.mock('@aws-sdk/s3-request-presigner');

describe('DownloaderHandler', () => {
  beforeEach(() => {
    getSignedUrl.mockReset();
  });

  it('should return file url when passing a filename', async () => {
    getSignedUrl.mockImplementationOnce(() => Promise.resolve('https://example.com/test.png'));
    const event = {
      queryStringParameters: {
        filename: 'test.png',
      },
    };

    const result = await handle(event);  

    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    expect(result.statusCode).toBe(301);
    expect(result.body).toBe('');
    expect(result.headers).toEqual({
      'Location': 'https://example.com/test.png',
    });
  });

  it('should return a not found error when missing filename', async () => {
    const event = {
      queryStringParameters: {},
    };

    const result = await handle(event);  

    expect(getSignedUrl).toHaveBeenCalledTimes(0);
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      message: 'Not Found',
    });
  });

  it('should return a not found error when missing queryStringParameters', async () => {
    const event = {};

    const result = await handle(event);  

    expect(getSignedUrl).toHaveBeenCalledTimes(0);
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      message: 'Not Found',
    });
  });
});
