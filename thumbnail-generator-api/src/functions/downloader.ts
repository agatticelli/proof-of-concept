import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';


import { notFound, redirect } from "../utils/responses";

const client = new S3Client({});

export const handle = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  const bucket = process.env.BUCKET_NAME;
  if (!bucket) {
    throw new Error("Bucket name is not defined");
  }

  const filename = event.queryStringParameters?.filename ?? null;
  if (!filename) {
    return notFound();
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: filename,
  });
  const url = await getSignedUrl(client, command, { expiresIn: 600 });

  return redirect(url);
}
