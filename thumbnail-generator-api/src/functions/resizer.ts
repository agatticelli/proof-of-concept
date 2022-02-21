import { basename } from 'path';

import { S3Client, PutObjectCommand, GetObjectCommand, GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { S3CreateEvent } from "aws-lambda";
import sharp from 'sharp';

import { thumbnailsPath, availableSizes } from '../commons';

const client = new S3Client({});

export const handle = async (event: S3CreateEvent): Promise<void> => {
  // retrieve original data
  const srcBucket = event.Records[0].s3.bucket.name;
  const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));

  // get original file
  let originalImageBody: GetObjectCommandOutput['Body'];
  try {
    const getCommand = new GetObjectCommand({
      Bucket: srcBucket,
      Key: srcKey,
    });
    originalImageBody = (await client.send(getCommand)).Body;
  } catch (getError) {
    console.error(`Failed to fetch original image`, {
      srcBucket, srcKey,
    }, getError);
    return;
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of originalImageBody) {
    chunks.push(chunk);
  }
  const originalImageBuffer = Buffer.concat(chunks);

  for (const size of availableSizes) {
    // generate thumbnail
    let buffer;
    try {
      const [width, height] = size.split('x');
      buffer = await sharp(originalImageBuffer)
        .resize(parseInt(width, 10), parseInt(height, 10))
        .toBuffer();
    } catch (resizeError) {
      console.error(`Failed to resize image`, {
        srcBucket, srcKey, size,
      }, resizeError);
      return;
    }

    // upload thumbnail
    try {
      const dstKey = `${thumbnailsPath}${size}/${basename(srcKey)}`;
      const putCommand = new PutObjectCommand({
        Bucket: srcBucket,
        Key: dstKey,
        Body: buffer,
      });
      await client.send(putCommand);
    } catch (uploadError) {
      console.error(`Failed to upload thumbnail`, {
        srcBucket, srcKey, size,
      }, uploadError);
      return;
    }
  }
}
