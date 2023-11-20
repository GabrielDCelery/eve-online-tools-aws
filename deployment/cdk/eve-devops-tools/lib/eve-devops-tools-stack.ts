import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as aws_ecr from "aws-cdk-lib/aws-ecr";

export class EveDevopsToolsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const repository = new aws_ecr.Repository(
      this,
      "EveMarketOrdersDownloaderRepository",
      {
        imageScanOnPush: false,
        imageTagMutability: aws_ecr.TagMutability.IMMUTABLE,
        autoDeleteImages: true,
        encryption: aws_ecr.RepositoryEncryption.AES_256,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        repositoryName:
          "eve-market-orders-downloader/download-queued-market-orders",
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
