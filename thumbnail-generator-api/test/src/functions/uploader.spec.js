const { mockClient } = require('aws-sdk-client-mock');
const { handle } = require('../../../src/functions/uploader');

const s3Mock = mockClient(S3Client);

describe('UploaderHandler', () => {
  beforeEach(() => {
    s3Mock.reset();
  });

  it('should return error when no filename present', async () => {
    const event = {
      body: JSON.stringify({
        filename: '',
        content: 'asdf',
      }),
    };

    const response = await handle(event);

    expect(response.statusCode).toEqual(400);
    expect(response.body).toEqual('No file name provided');
  });
});