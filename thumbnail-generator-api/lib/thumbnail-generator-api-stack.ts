import { Stack, StackProps } from 'aws-cdk-lib';
import { RestApi, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class ThumbnailGeneratorApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // create bucket to store uploaded images
    new Bucket(this, 'ThumbnailBucket', {
      bucketName: 'thumbnails-store',
    });

    // create lambda function to update images to s3
    const uploadHandler = new NodejsFunction(this, 'ImageUploadHandler', {
      entry: 'src/functions/uploader.ts',
      handler: 'handle',
      runtime: Runtime.NODEJS_14_X,
    });

    // create API gateway to expose upload handler
    const api = new RestApi(this, 'ThumbnailGeneratorApi', {
      binaryMediaTypes: ['image/png', 'image/jpeg'],
    });
    const uploadEndpoint = api.root.addResource('upload');
    uploadEndpoint.addMethod('POST', new LambdaIntegration(uploadHandler));
  }
}
