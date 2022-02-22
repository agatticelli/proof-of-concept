import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { RestApi, LambdaIntegration, CognitoUserPoolsAuthorizer } from 'aws-cdk-lib/aws-apigateway';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { UserPool, AccountRecovery, UserPoolClient, UserPoolClientIdentityProvider } from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

import { bucketName, thumbnailsSizes } from '../src/config';

export class ThumbnailGeneratorApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // --------- COGNITO AUTH ---------
    // create cognito user pool
    const userPool = new UserPool(this, 'UserPool', {
      userPoolName: `my-user-pool`,
      removalPolicy: RemovalPolicy.DESTROY,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 6,
        requireLowercase: false,
        requireDigits: false,
        requireUppercase: false,
        requireSymbols: false,
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
    });

    // create the user pool client
    const userPoolClient = new UserPoolClient(this, 'UserPoolClient', {
      userPool,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        custom: true,
      },
      supportedIdentityProviders: [
        UserPoolClientIdentityProvider.COGNITO,
      ],
    });

    // create the authorizer
    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [userPool],
      authorizerName: 'ThumbnailGeneratorApiAuthorizer',
      identitySource: 'method.request.header.Authorization',
    });

    // --------- IMAGE CREATION ---------
    // create bucket to store uploaded images
    const bucket = new Bucket(this, 'ThumbnailBucket', {
      bucketName,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // create lambda function to update images to s3
    const uploadHandler = new NodejsFunction(this, 'ImageUploadHandler', {
      entry: 'src/functions/uploader.ts',
      handler: 'handle',
      runtime: Runtime.NODEJS_14_X,
      environment: {
        THUMBNAILS_BUCKET_NAME: bucket.bucketName,
        THUMBNAILS_SIZES: thumbnailsSizes,
      },
    });

    // grant lambda function to write to bucket
    bucket.grantWrite(uploadHandler);

    // create API gateway to expose upload handler
    const api = new RestApi(this, 'ThumbnailGeneratorApi');
    const imageEndpoint = api.root.addResource('images');
    imageEndpoint.addMethod('POST', new LambdaIntegration(uploadHandler), {
      authorizer, // authorize uploads
    });


    // --------- THUMBNAIL GENERATION ---------
    // create resize handler
    const resizerHandler = new NodejsFunction(this, 'ImageResizerHandler', {
      entry: 'src/functions/resizer.ts',
      handler: 'handle',
      runtime: Runtime.NODEJS_14_X,
      environment: {
        THUMBNAILS_SIZES: thumbnailsSizes,
      },
      bundling: {
        nodeModules: ['sharp'],
      },
    });

    // bind s3 event source to resize handler
    resizerHandler.addEventSource(new S3EventSource(bucket, {
      events: [EventType.OBJECT_CREATED],
      filters: [{ prefix: 'uploads/' }],
    }));

    // grant resize function to read/write from/to bucket
    bucket.grantReadWrite(resizerHandler);


    // --------- THUMBNAIL DOWNLOADER ---------
    // create thumbnail download handler
    const downloadThumbnailHandler = new NodejsFunction(this, 'DownloadThumbnailHandler', {
      entry: 'src/functions/downloader.ts',
      handler: 'handle',
      runtime: Runtime.NODEJS_14_X,
      environment: {
        THUMBNAILS_BUCKET_NAME: bucket.bucketName,
      },
    });

    // add handler to api
    imageEndpoint.addMethod('GET', new LambdaIntegration(downloadThumbnailHandler));

    // grant downloader function to read from bucket
    bucket.grantRead(downloadThumbnailHandler);


    // --------- OUTPUT ---------
    new CfnOutput(this, 'userPoolId', { value: userPool.userPoolId });
    new CfnOutput(this, 'userPoolClientId', { value: userPoolClient.userPoolClientId });
  }
}
