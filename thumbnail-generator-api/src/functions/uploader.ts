import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fileTypeFromBuffer } from 'file-type';
import { nanoid } from 'nanoid';

import { badRequest, ok } from '../utils/responses';
import { thumbnailsPath } from '../commons';

type UploadEventBody = {
  filename: string;
  content: string;
};

const client = new S3Client({});
const uploadPath = 'uploads/';
const validMimes = ['image/jpeg', 'image/png'];
const availableSizes = process.env.THUMBNAILS_SIZES?.split(',') || [];
const bucket = process.env.THUMBNAILS_BUCKET_NAME;

export const handle = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  let input: UploadEventBody;
  try {
    input = JSON.parse(event.body ?? '') as UploadEventBody;
  } catch (err) {
    return badRequest('Invalid request body');
  }

  if (!input.filename) {
    return badRequest('filename is not defined');
  }

  if (!input.content) {
    return badRequest('content is empty');
  }

  const filename = `${nanoid(5)}-${encodeURIComponent(input.filename)}`;
  const fileContent = input.content;

  // create buffer from file content
  const fileBuffer = Buffer.from(fileContent, 'base64');

  // get real file type
  const filetype = await fileTypeFromBuffer(fileBuffer);
  if (!filetype) {
    return badRequest('Invalid file');
  }

  if (!validMimes.includes(filetype.mime)) {
    return badRequest('File type is not supported');
  }

  // check maxlength of 5mb
  if (fileBuffer.length > 5 * 1024 * 1024) {
    return badRequest('File is too large. Max: 5mb');
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: `${uploadPath}${filename}`,
    Body: fileBuffer,
  });
  await client.send(command);

  const thumbnails = availableSizes.reduce<string[]>((acc, size) => {
    acc.push(`${thumbnailsPath}${size}/${filename}`);
    return acc;
  }, []);

  return ok({
    thumbnails,
  });
}
