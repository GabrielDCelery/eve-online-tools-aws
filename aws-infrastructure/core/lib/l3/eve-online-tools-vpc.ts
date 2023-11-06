import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface EveOnlineToolsVpcConstructProps {
    cidrBlock: string;
    vpcName: string;
    vpcRegion: string;
}

export class EveOnlineToolsVpcConstruct extends Construct {
    public vpc: ec2.Vpc;

    constructor(scope: Construct, id: string, props: EveOnlineToolsVpcConstructProps) {
        super(scope, id);
        const vpc = this.createVpc({ props });
        // this.createCustomNATGateway({ vpc, props });
        this.createCustomNATGatewayV2({ vpc, props });

        this.vpc = vpc;
    }

    private createVpc({ props }: { props: EveOnlineToolsVpcConstructProps }): ec2.Vpc {
        const vpc = new ec2.Vpc(this, 'Vpc', {
            ipAddresses: ec2.IpAddresses.cidr(props.cidrBlock),
            maxAzs: 2,
            natGateways: 0,
            subnetConfiguration: [
                {
                    cidrMask: 19,
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 19,
                    name: 'Private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
                {
                    cidrMask: 19,
                    name: 'Isolated',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
            ],
            vpcName: props.vpcName,
            restrictDefaultSecurityGroup: true,
        });
        return vpc;
    }

    private createCustomNATGateway({ vpc }: { vpc: ec2.Vpc; props: EveOnlineToolsVpcConstructProps }) {
        const natGatewaySecurityGroup = new ec2.SecurityGroup(this, 'VpcNatGatewaySecurityGroup', {
            vpc: vpc,
            description: 'Custom Vpc Nat gateway security group',
            allowAllOutbound: false,
        });

        vpc.privateSubnets.forEach((privateSubnet) => {
            natGatewaySecurityGroup.addIngressRule(ec2.Peer.ipv4(privateSubnet.ipv4CidrBlock), ec2.Port.tcp(80));
            natGatewaySecurityGroup.addIngressRule(ec2.Peer.ipv4(privateSubnet.ipv4CidrBlock), ec2.Port.tcp(443));
        });

        natGatewaySecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
        natGatewaySecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));

        const ec2Instance = new ec2.Instance(this, `VpcNatGateway`, {
            vpc: vpc,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
            machineImage: ec2.MachineImage.genericLinux({
                'eu-west-2': 'ami-02719b84cb731adfa',
            }),
            sourceDestCheck: false,
            associatePublicIpAddress: true,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
            },
            availabilityZone: vpc.availabilityZones[0],
            securityGroup: natGatewaySecurityGroup,
        });

        new ec2.CfnRoute(this, `VpcPrivateSubnetNatGatewayRoute`, {
            routeTableId: vpc.privateSubnets[0].routeTable.routeTableId,
            destinationCidrBlock: '0.0.0.0/0',

            instanceId: ec2Instance.instanceId,
        });
    }

    private createCustomNATGatewayV2({ vpc, props }: { vpc: ec2.Vpc; props: EveOnlineToolsVpcConstructProps }) {
        const natGatewaySecurityGroup = new ec2.SecurityGroup(this, 'VpcNatGatewaySecurityGroup', {
            vpc: vpc,
            description: 'Custom Vpc Nat gateway security group',
            allowAllOutbound: false,
        });

        natGatewaySecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22));

        vpc.privateSubnets.forEach((privateSubnet) => {
            natGatewaySecurityGroup.addIngressRule(ec2.Peer.ipv4(privateSubnet.ipv4CidrBlock), ec2.Port.tcp(80));
            natGatewaySecurityGroup.addIngressRule(ec2.Peer.ipv4(privateSubnet.ipv4CidrBlock), ec2.Port.tcp(443));
        });

        natGatewaySecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
        natGatewaySecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));

        const natGatewayInstanceRole = new iam.Role(this, 'NatGatewayInstanceRole', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            inlinePolicies: {
                toExecuteUserData: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: ['ec2:DescribeNetworkInterfaces'],
                            resources: ['*'],
                        }),
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: ['ec2:CreateRoute', 'ec2:ReplaceRoute'],
                            resources: ['*'],
                        }),
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: ['ec2:ModifyNetworkInterfaceAttribute'],
                            resources: ['*'],
                        }),
                    ],
                }),
            },
        });

        const natGatewayLaunchTemplate = new ec2.LaunchTemplate(this, 'NatGatewayLaunchTemplate', {
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
            machineImage: ec2.MachineImage.genericLinux({
                'eu-west-2': 'ami-02719b84cb731adfa',
            }),
            securityGroup: natGatewaySecurityGroup,
            associatePublicIpAddress: true,
            userData: (() => {
                const userData = ec2.UserData.forLinux();
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
            keyName: 'gzeller_nas',
        });

        new autoscaling.AutoScalingGroup(this, 'NatGatewayAutoScalingGroup', {
            vpc: vpc,
            vpcSubnets: {
                // subnetType: ec2.SubnetType.PUBLIC,
                subnets: [vpc.publicSubnets[0]],
            },
            launchTemplate: natGatewayLaunchTemplate,
            minCapacity: 1,
            maxCapacity: 1,
            healthCheck: autoscaling.HealthCheck.ec2({
                grace: cdk.Duration.minutes(3),
            }),
        });
    }
}
