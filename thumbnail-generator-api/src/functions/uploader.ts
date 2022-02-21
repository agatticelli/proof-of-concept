import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fileTypeFromBuffer } from 'file-type';
import { nanoid } from "nanoid";

import { badRequest, ok } from "../utils/responses";
import { availableSizes, thumbnailsPath } from "../commons";

type UploadEventBody = {
  fileName: string;
  content: string;
};

const client = new S3Client({});
const uploadPath = 'uploads/';
const validMimes = ['image/jpeg', 'image/png'];

export const handle = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  const bucket = process.env.BUCKET_NAME;
  if (!bucket) {
    throw new Error("Bucket name is not defined");
  }

  let fileName: string;
  let fileContent;
  try {
    const input = JSON.parse(event.body ?? '') as UploadEventBody;
    fileName = `${nanoid(5)}-${encodeURIComponent(input.fileName)}`;
    fileContent = input.content;
  } catch (err) {
    return badRequest("Invalid request body");
  }

  if (!fileName) {
    return badRequest("File name is not defined");
  }

  if (!fileContent) {
    return badRequest("File content is not defined");
  }

  // create buffer from file content
  const fileBuffer = Buffer.from(fileContent, 'base64');

  // get real file type
  const filetype = await fileTypeFromBuffer(fileBuffer);
  if (!filetype) {
    return badRequest("Invalid file");
  }

  if (!validMimes.includes(filetype.mime)) {
    return badRequest("File type is not supported");
  }

  // check maxlength of 5mb
  if (fileBuffer.length > 5 * 1024 * 1024) {
    return badRequest("File is too large. Max: 5mb");
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: `${uploadPath}${fileName}`,
    Body: fileBuffer,
  });
  await client.send(command);

  const thumbnails = availableSizes.reduce<string[]>((acc, size) => {
    acc.push(`${thumbnailsPath}${size}/${fileName}`);
    return acc;
  }, []);

  return ok({
    thumbnails,
  });
}
