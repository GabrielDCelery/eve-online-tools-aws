import * as aws_cdk from 'aws-cdk-lib';
import * as aws_ec2 from 'aws-cdk-lib/aws-ec2';
import * as aw_autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as aws_iam from 'aws-cdk-lib/aws-iam';
import * as aws_logs from 'aws-cdk-lib/aws-logs';
import * as aws_cr from 'aws-cdk-lib/custom-resources';
import * as uuid from 'uuid';
import { Construct } from 'constructs';

export interface EveOnlineToolsVpcConstructProps {
    cidrBlock: string;
    vpcName: string;
    vpcRegion: string;
}

export class EveOnlineToolsVpcConstruct extends Construct {
    public vpc: aws_ec2.Vpc;

    constructor(scope: Construct, id: string, props: EveOnlineToolsVpcConstructProps) {
        super(scope, id);
        const vpc = this.createVpc({ props });
        this.createCustomNATGateway({ vpc, props });

        this.vpc = vpc;
    }

    private createVpc({ props }: { props: EveOnlineToolsVpcConstructProps }): aws_ec2.Vpc {
        const vpc = new aws_ec2.Vpc(this, 'Vpc', {
            ipAddresses: aws_ec2.IpAddresses.cidr(props.cidrBlock),
            maxAzs: 2,
            natGateways: 0,
            subnetConfiguration: [
                {
                    cidrMask: 19,
                    name: 'Public',
                    subnetType: aws_ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 19,
                    name: 'Private',
                    subnetType: aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
                {
                    cidrMask: 19,
                    name: 'Isolated',
                    subnetType: aws_ec2.SubnetType.PRIVATE_ISOLATED,
                },
            ],
            vpcName: props.vpcName,
            restrictDefaultSecurityGroup: true,
        });
        return vpc;
    }

    private createCustomNATGateway({ vpc, props }: { vpc: aws_ec2.Vpc; props: EveOnlineToolsVpcConstructProps }) {
        const natGatewaySecurityGroup = new aws_ec2.SecurityGroup(this, 'VpcNatGatewaySecurityGroup', {
            vpc: vpc,
            description: 'Custom Vpc Nat gateway security group',
            allowAllOutbound: false,
        });

        vpc.privateSubnets.forEach((privateSubnet) => {
            natGatewaySecurityGroup.addIngressRule(aws_ec2.Peer.ipv4(privateSubnet.ipv4CidrBlock), aws_ec2.Port.tcp(80));
            natGatewaySecurityGroup.addIngressRule(aws_ec2.Peer.ipv4(privateSubnet.ipv4CidrBlock), aws_ec2.Port.tcp(443));
        });

        natGatewaySecurityGroup.addEgressRule(aws_ec2.Peer.anyIpv4(), aws_ec2.Port.tcp(80));
        natGatewaySecurityGroup.addEgressRule(aws_ec2.Peer.anyIpv4(), aws_ec2.Port.tcp(443));

        const natGatewayUserDataPolicy = new aws_iam.ManagedPolicy(this, 'NatGatewayUserDataPolicy', {
            statements: [
                new aws_iam.PolicyStatement({
                    effect: aws_iam.Effect.ALLOW,
                    actions: ['ec2:DescribeNetworkInterfaces'],
                    resources: ['*'],
                }),
                new aws_iam.PolicyStatement({
                    effect: aws_iam.Effect.ALLOW,
                    actions: ['ec2:CreateRoute', 'ec2:ReplaceRoute'],
                    resources: ['*'],
                }),
                new aws_iam.PolicyStatement({
                    effect: aws_iam.Effect.ALLOW,
                    actions: ['ec2:ModifyNetworkInterfaceAttribute'],
                    resources: ['*'],
                }),
            ],
        });

        const natGatewayInstanceRole = new aws_iam.Role(this, 'NatGatewayInstanceRole', {
            assumedBy: new aws_iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [natGatewayUserDataPolicy],
        });

        const natGatewayLaunchTemplate = new aws_ec2.LaunchTemplate(this, 'NatGatewayLaunchTemplate', {
            instanceType: aws_ec2.InstanceType.of(aws_ec2.InstanceClass.T3A, aws_ec2.InstanceSize.NANO),
            machineImage: aws_ec2.MachineImage.genericLinux({
                'eu-west-2': 'ami-02719b84cb731adfa',
            }),
            securityGroup: natGatewaySecurityGroup,
            associatePublicIpAddress: true,
            userData: (() => {
                const userData = aws_ec2.UserData.forLinux();
                userData.addCommands(
                    `yum update -y aws-cfn-bootstrap`,
                    `yum install -y jq`,
                    `export EC2_INSTANCE_ID=$(curl http://169.254.169.254/latest/meta-data/instance-id)`,
                    `export ENI=$(aws ec2 describe-network-interfaces --region ${props.vpcRegion} | jq --arg v1 "$EC2_INSTANCE_ID" '.NetworkInterfaces[] | select(.Attachment.InstanceId==$v1) | .NetworkInterfaceId' | sed "s/\\"//g")`,
                    `aws ec2 modify-network-interface-attribute --region ${props.vpcRegion} --network-interface-id $ENI --no-source-dest-check`,
                    `aws ec2 create-route --region ${props.vpcRegion} --route-table-id ${vpc.privateSubnets[0].routeTable.routeTableId} --destination-cidr-block "0.0.0.0/0" --network-interface-id $ENI > /dev/null`,
                    `aws ec2 replace-route --region ${props.vpcRegion} --route-table-id ${vpc.privateSubnets[0].routeTable.routeTableId} --destination-cidr-block "0.0.0.0/0" --network-interface-id $ENI > /dev/null`
                );
                return userData;
            })(),
            role: natGatewayInstanceRole,
        });

        const autoScalingGroup = new aw_autoscaling.AutoScalingGroup(this, 'NatGatewayAutoScalingGroup', {
            vpc: vpc,
            vpcSubnets: {
                // subnetType: ec2.SubnetType.PUBLIC,
                subnets: [vpc.publicSubnets[0]],
            },
            launchTemplate: natGatewayLaunchTemplate,
            minCapacity: 1,
            maxCapacity: 1,
            healthCheck: aw_autoscaling.HealthCheck.ec2({
                grace: aws_cdk.Duration.minutes(2),
            }),
        });

        const onCreate: aws_cr.AwsSdkCall = {
            service: 'AutoScaling',
            action: 'startInstanceRefresh',
            parameters: {
                AutoScalingGroupName: autoScalingGroup.autoScalingGroupName,
            },
            /*
            parameters: {
                AutoScalingGroupName: autoScalingGroup.autoScalingGroupName,
                DesiredConfiguration: {
                    LaunchTemplate: {
                        LaunchTemplateId: natGatewayLaunchTemplate.launchTemplateId,
                        Version: '$Latest',
                    },
                },
                Preferences: {
                    AutoRollback: true,
                },
            },
            */
            physicalResourceId: aws_cr.PhysicalResourceId.of(`startInstanceRefresh:${autoScalingGroup.autoScalingGroupName}`),
        };

        // const a = aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2FullAccess');

        const customResource = new aws_cr.AwsCustomResource(this, `NatGatewayInstanceRefresh${uuid.v4().replace(/-/g, '')}`, {
            policy: aws_cr.AwsCustomResourcePolicy.fromStatements([
                new aws_iam.PolicyStatement({
                    effect: aws_iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: ['autoscaling:StartInstanceRefresh'],
                }),
                /*
                new aws_iam.PolicyStatement({
                    effect: aws_iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: ['ec2:DescribeLaunchTemplates'],
                }),
                new aws_iam.PolicyStatement({
                    effect: aws_iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: ['ec2:DescribeLaunchTemplateVersions'],
                }),
                */
            ]),
            logRetention: aws_logs.RetentionDays.ONE_DAY,
            onCreate,
        });

        customResource.node.addDependency(autoScalingGroup);
    }
}
