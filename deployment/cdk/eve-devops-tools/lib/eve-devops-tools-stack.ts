import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as aws_ecr from "aws-cdk-lib/aws-ecr";

export class EveDevopsToolsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new aws_ecr.Repository(
      this,
      "EveMarketOrdersDownloaderDownloadQueuedMarketOrdersRepository",
      {
        imageScanOnPush: false,
        imageTagMutability: aws_ecr.TagMutability.MUTABLE,
        autoDeleteImages: true,
        encryption: aws_ecr.RepositoryEncryption.AES_256,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        repositoryName:
          "eve-market-orders-downloader/download-queued-market-orders",
      }
    );

    new aws_ecr.Repository(
      this,
      "EveMarketOrdersDownloaderQueueMarketOrdersForDownloadRepository",
      {
        imageScanOnPush: false,
        imageTagMutability: aws_ecr.TagMutability.MUTABLE,
        autoDeleteImages: true,
        encryption: aws_ecr.RepositoryEncryption.AES_256,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        repositoryName:
          "eve-market-orders-downloader/queue-market-orders-for-download",
      }
    );

    /*
    new cdk.CfnOutput(this, "EveMarketOrdersDownloaderRepositoryCfnOutput", {
      exportName: "EveMarketOrdersRepository",
      value: repository.repositoryName,
    });
    */
  }
}
