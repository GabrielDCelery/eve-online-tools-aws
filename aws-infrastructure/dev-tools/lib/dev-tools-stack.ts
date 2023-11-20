import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as aws_ecr from "aws-cdk-lib/aws-ecr";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class DevToolsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const repository = new aws_ecr.Repository(this, "EveServicesRepository", {
      imageScanOnPush: true,
      imageTagMutability: aws_ecr.TagMutability.IMMUTABLE,
      repositoryName: "eve-services",
    });

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'DevToolsQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
