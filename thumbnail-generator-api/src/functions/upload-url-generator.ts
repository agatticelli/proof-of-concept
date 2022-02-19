import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3 } from "aws-sdk";
import { badRequest, ok } from "../utils/responses";

type UploadEventBody = {
  fileName: string;
};

const s3Client = new S3();
const uploadPath = 'uploads/';

export const handle = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const bucket = process.env.BUCKET_NAME;
  if (!bucket) {
    throw new Error("Bucket name is not defined");
  }

  let fileName;
  try {
    const input = JSON.parse(event.body ?? '') as UploadEventBody;
    fileName = input.fileName;
  } catch (err) {
    return badRequest("Invalid request body")
  }

  if (!fileName) {
    return badRequest("File name is not defined");
  }

  const fullPath = uploadPath + fileName;
  const params = {
    Bucket: bucket,
    Key: fullPath,
    Expires: 1200, // 20 minutes
    Conditions: [
      ['content-length-range', 0, 5242880],
    ],
  };

  const upload_url = await s3Client.getSignedUrlPromise('putObject', params);

  return ok({ upload_url });
};
