import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as aws_ec2 from "aws-cdk-lib/aws-ec2";
import * as aws_sqs from "aws-cdk-lib/aws-sqs";
import * as aws_ecs from "aws-cdk-lib/aws-ecs";
import * as aws_ecr from "aws-cdk-lib/aws-ecr";

interface EveMarketOrdersDownloaderStackProps extends cdk.StackProps {
  env: {
    account: string;
    region: string;
  };
  availabilityZone: string;
}

export class EveMarketOrdersDownloaderStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: EveMarketOrdersDownloaderStackProps
  ) {
    super(scope, id, props);

    const defaultVolume = new aws_ec2.Volume(
      this,
      "EveMarketOrdersDownloaderDefaultStorage",
      {
        volumeType: aws_ec2.EbsDeviceVolumeType.GENERAL_PURPOSE_SSD_GP3,
        size: cdk.Size.gibibytes(500),
        encrypted: true,
        availabilityZone: props.availabilityZone,
      }
    );

    const eveMarketOrdersRequestDeadLetterQueue = new aws_sqs.Queue(
      this,
      "EveMarketOrdersDownloaderRequestDeadLetterQueue",
      {
        deliveryDelay: cdk.Duration.seconds(0),
        retentionPeriod: cdk.Duration.days(14),
        maxMessageSizeBytes: 262144,
        encryption: aws_sqs.QueueEncryption.UNENCRYPTED,
      }
    );

    const eveMarketOrdersRequestQueue = new aws_sqs.Queue(
      this,
      "EveMarketOrdersDownloaderRequestQueue",
      {
        visibilityTimeout: cdk.Duration.minutes(1),
        deliveryDelay: cdk.Duration.seconds(0),
        receiveMessageWaitTime: cdk.Duration.seconds(20),
        retentionPeriod: cdk.Duration.minutes(30),
        maxMessageSizeBytes: 262144,
        encryption: aws_sqs.QueueEncryption.UNENCRYPTED,
        deadLetterQueue: {
          maxReceiveCount: 3,
          queue: eveMarketOrdersRequestDeadLetterQueue,
        },
      }
    );
    /*
    const cluster = new aws_ecs.Cluster(
      this,
      "EveMarketOrdersDownloaderCluster",
      {
        enableFargateCapacityProviders: true,
      }
    );

    const taskDefinition = new aws_ecs.FargateTaskDefinition(
      this,
      "EveMarketOrdersDownloaderFargateTaskDefinition"
    );

    const repository = aws_ecr.Repository.fromRepositoryName(
      this,
      "EveMarketOrdersDownloaderRepository",
      "evedevopstoolsstack-evemarketordersdownloaderrepositoryd9525702-notsnecftfph"
    );

    taskDefinition.addContainer("EveMarketOrdersDownloader", {
      image: aws_ecs.ContainerImage.fromEcrRepository(repository, "latest"),
    });

    const fargateService = new aws_ecs.FargateService(
      this,
      "EveMarketOrdersDownloaderFargateService",
      {
        cluster,
        taskDefinition,
      }
    );

 */
  }
}
