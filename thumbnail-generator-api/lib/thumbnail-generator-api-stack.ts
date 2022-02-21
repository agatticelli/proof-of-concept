import { Stack, StackProps } from 'aws-cdk-lib';
import { RestApi, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';

export class ThumbnailGeneratorApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // --------- IMAGE CREATION ---------
    // create bucket to store uploaded images
    const bucket = new Bucket(this, 'ThumbnailBucket', {
      bucketName: 'thumbnails-store',
    });

    // create lambda function to update images to s3
    const uploadHandler = new NodejsFunction(this, 'ImageUploadHandler', {
      entry: 'src/functions/uploader.ts',
      handler: 'handle',
      runtime: Runtime.NODEJS_14_X,
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });

    // grant lambda function to write to bucket
    bucket.grantWrite(uploadHandler);

    // create API gateway to expose upload handler
    const api = new RestApi(this, 'ThumbnailGeneratorApi');
    const imageEndpoint = api.root.addResource('images');
    imageEndpoint.addMethod('POST', new LambdaIntegration(uploadHandler));


    // --------- THUMBNAIL GENERATION ---------
    // create resize handler
    const resizerHandler = new NodejsFunction(this, 'ImageResizerHandler', {
      entry: 'src/functions/resizer.ts',
      handler: 'handle',
      runtime: Runtime.NODEJS_14_X,
      bundling: {
        nodeModules: ['sharp'],
      }
    });

    // bind s3 event source to resize handler
    resizerHandler.addEventSource(new S3EventSource(bucket, {
      events: [EventType.OBJECT_CREATED],
      filters: [{ prefix: 'uploads/' }],
    }));

    // grant resize function to read/write from/to bucket
    bucket.grantReadWrite(resizerHandler);
  }
}
