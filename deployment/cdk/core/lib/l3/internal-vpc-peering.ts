import * as aws_ec2 from 'aws-cdk-lib/aws-ec2';
import * as aws_iam from 'aws-cdk-lib/aws-iam';
import * as aws_logs from 'aws-cdk-lib/aws-logs';
import * as aws_cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export interface InternalVpcPeeringConstructProps {
    requesterVpc: aws_ec2.Vpc;
    accepterVpc: aws_ec2.Vpc;
    accepterOwnerId: string;
    accepterRegion: string;
}

export class InternalVpcPeeringConstruct extends Construct {
    constructor(scope: Construct, id: string, props: InternalVpcPeeringConstructProps) {
        super(scope, id);

        const peeringConnection = this.createPeeringConnection({ props });
        this.createRoutesFromRequesterToAccepter({ peeringConnection, props });
        this.enablePeeringDNSResolution({ peeringConnection, props });
    }

    private createPeeringConnection({ props }: { props: InternalVpcPeeringConstructProps }): aws_ec2.CfnVPCPeeringConnection {
        const peeringConnection = new aws_ec2.CfnVPCPeeringConnection(this, `Connection`, {
            vpcId: props.requesterVpc.vpcId,
            peerVpcId: props.accepterVpc.vpcId,
            peerOwnerId: props.accepterOwnerId,
            peerRegion: props.accepterRegion,
            tags: [
                {
                    key: 'Name',
                    value: `${props.requesterVpc.vpcId} -> ${props.accepterVpc.vpcId}`,
                },
            ],
        });
        return peeringConnection;
    }

    private createRoutesFromRequesterToAccepter({ peeringConnection, props }: { peeringConnection: aws_ec2.CfnVPCPeeringConnection; props: InternalVpcPeeringConstructProps }) {
        props.requesterVpc.privateSubnets.forEach(({ routeTable: { routeTableId } }, index) => {
            const route = new aws_ec2.CfnRoute(this, 'PrivateSubnetPeeringConnectionRoute' + index, {
                destinationCidrBlock: props.accepterVpc.vpcCidrBlock,
                routeTableId,
                vpcPeeringConnectionId: peeringConnection.ref,
            });
            route.addDependency(peeringConnection);
        });
    }

    private enablePeeringDNSResolution({ peeringConnection }: { peeringConnection: aws_ec2.CfnVPCPeeringConnection; props: InternalVpcPeeringConstructProps }) {
        const onCreate: aws_cr.AwsSdkCall = {
            service: 'EC2',
            action: 'modifyVpcPeeringConnectionOptions',
            parameters: {
                VpcPeeringConnectionId: peeringConnection.ref,
                AccepterPeeringConnectionOptions: {
                    AllowDnsResolutionFromRemoteVpc: true,
                },
                RequesterPeeringConnectionOptions: {
                    AllowDnsResolutionFromRemoteVpc: true,
                },
            },
            physicalResourceId: aws_cr.PhysicalResourceId.of(`enableVPCPeeringDNSResolution:${peeringConnection.ref}`),
        };
        const onUpdate = onCreate;
        const onDelete: aws_cr.AwsSdkCall = {
            service: 'EC2',
            action: 'modifyVpcPeeringConnectionOptions',
            parameters: {
                VpcPeeringConnectionId: peeringConnection.ref,
                AccepterPeeringConnectionOptions: {
                    AllowDnsResolutionFromRemoteVpc: false,
                },
                RequesterPeeringConnectionOptions: {
                    AllowDnsResolutionFromRemoteVpc: false,
                },
            },
        };

        const customResource = new aws_cr.AwsCustomResource(this, 'EnablePeeringDNSResolution', {
            policy: aws_cr.AwsCustomResourcePolicy.fromStatements([
                new aws_iam.PolicyStatement({
                    effect: aws_iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: ['ec2:ModifyVpcPeeringConnectionOptions'],
                }),
            ]),
            logRetention: aws_logs.RetentionDays.ONE_DAY,
            onCreate,
            onUpdate,
            onDelete,
        });

        customResource.node.addDependency(peeringConnection);
    }
}
