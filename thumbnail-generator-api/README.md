# Thumbnail generator

This project deploys all necessary AWS services needed to upload an image, generate thubmnails and make those thumnails available for download.

## Requirements
- AWS CLI
- AWS CDK (>=2.12.0)
- NodeJS (>= 10.13.0)

## Usage
### 1. Setup AWS account
First setup the aws account to use. Open a terminal and run:
```bash
aws configure
```

### 2. Deploy with CDK
Configure environment variables and deploy :)
```bash
FOO=123 BAR=abc cdk deploy
```

## Available configurations
This project can be customizez by using the following envinroment variables.

#### BUCKET_NAME
The destination bucket where files are uploaded. Default _thumbnails-store_.

#### THUMBNAIL_SIZES
Specifies the available sizes, separated by comma, for the generated thubmnails. Default _400x300,160x120,120x120_.

## Cleanup
To delete all deployed stack just run:
```bash
cdk destroy
```

## Swagger Docs UI
In order to see/edit swagger docs, you should navigate into _swagger-docs_ folder and run start scripts.
```bash
cd swagger-docs && npm start
```