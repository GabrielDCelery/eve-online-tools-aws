import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as aws_ec2 from "aws-cdk-lib/aws-ec2";
import * as aws_sqs from "aws-cdk-lib/aws-sqs";
import * as aws_ecs from "aws-cdk-lib/aws-ecs";
import * as aws_ecr from "aws-cdk-lib/aws-ecr";
import * as aws_iam from "aws-cdk-lib/aws-iam";
import * as aws_ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as aws_applicationautoscaling from "aws-cdk-lib/aws-applicationautoscaling";

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

    const defaultVolume = new aws_ec2.Volume(this, "DefaultEbsStorage", {
      volumeType: aws_ec2.EbsDeviceVolumeType.GENERAL_PURPOSE_SSD_GP3,
      size: cdk.Size.gibibytes(1),
      encrypted: true,
      availabilityZone: props.availabilityZone,
    });

    const eveMarketOrdersRequestDeadLetterQueue = new aws_sqs.Queue(
      this,
      "RequestDeadLetterQueue",
      {
        deliveryDelay: cdk.Duration.seconds(0),
        retentionPeriod: cdk.Duration.days(14),
        maxMessageSizeBytes: 262144,
        encryption: aws_sqs.QueueEncryption.UNENCRYPTED,
      }
    );

    const eveMarketOrdersRequestQueue = new aws_sqs.Queue(
      this,
      "RequestQueue",
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

    const cluster = new aws_ecs.Cluster(this, "Cluster", {
      enableFargateCapacityProviders: true,
    });

    const taskIamPolicy = new aws_iam.ManagedPolicy(
      this,
      "QueueMarketOrdersForDownloadsFargateTaskPolicy",
      {
        document: new aws_iam.PolicyDocument({
          statements: [
            new aws_iam.PolicyStatement({
              effect: aws_iam.Effect.ALLOW,
              resources: [eveMarketOrdersRequestQueue.queueArn],
              actions: ["sqs:SendMessage"],
            }),
          ],
        }),
      }
    );

    const taskRole = new aws_iam.Role(
      this,
      "QueueMarketOrdersForDownloadFargateTaskRole",
      {
        assumedBy: new aws_iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
        managedPolicies: [taskIamPolicy],
      }
    );

    const taskDefinition = new aws_ecs.FargateTaskDefinition(
      this,
      "QueueMarketOrdersForDownloadFargateTaskDefinition",
      {
        cpu: 256,
        memoryLimitMiB: 512,
        taskRole: taskRole,
      }
    );

    const repository = aws_ecr.Repository.fromRepositoryName(
      this,
      "QueueMarketOrdersForDownloadRepository",
      "eve-market-orders-downloader/queue-market-orders-for-download"
    );

    taskDefinition.addContainer("QueueMarketOrdersForDownloadContainer", {
      image: aws_ecs.ContainerImage.fromEcrRepository(repository, "latest"),
      environment: {
        AWS_REGION: props.env.region,
        SQS_QUEUE_URL: eveMarketOrdersRequestQueue.queueUrl,
      },
    });

    new aws_ecs_patterns.ScheduledFargateTask(
      this,
      "QueueMarketOrdersForDownloadFargateService",
      {
        schedule: aws_applicationautoscaling.Schedule.cron({
          minute: "0",
          hour: "7",
          day: "*",
          month: "*",
          year: "*",
        }),
        cluster: cluster,
        scheduledFargateTaskDefinitionOptions: { taskDefinition },
      }
    );
    /*
    const fargateService = new aws_ecs.FargateService(
      this,
      "EveMarketOrdersDownloaderQueueMarketOrdersForDownloadFargateService",
      {
        cluster,
        taskDefinition,
        desiredCount: 0,
      }
    );
    */
  }
}
