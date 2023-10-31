import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { AwsCustomResource, AwsCustomResourcePolicy, AwsSdkCall, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export interface InternalVpcPeeringConstructProps {
    requesterVpc: ec2.Vpc;
    accepterVpc: ec2.Vpc;
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

    private createPeeringConnection({ props }: { props: InternalVpcPeeringConstructProps }): ec2.CfnVPCPeeringConnection {
        const peeringConnection = new ec2.CfnVPCPeeringConnection(this, `Connection`, {
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

    private createRoutesFromRequesterToAccepter({ peeringConnection, props }: { peeringConnection: ec2.CfnVPCPeeringConnection; props: InternalVpcPeeringConstructProps }) {
        props.requesterVpc.privateSubnets.forEach(({ routeTable: { routeTableId } }, index) => {
            const route = new ec2.CfnRoute(this, 'PrivateSubnetPeeringConnectionRoute' + index, {
                destinationCidrBlock: props.accepterVpc.vpcCidrBlock,
                routeTableId,
                vpcPeeringConnectionId: peeringConnection.ref,
            });
            route.addDependency(peeringConnection);
        });
    }

    private enablePeeringDNSResolution({ peeringConnection }: { peeringConnection: ec2.CfnVPCPeeringConnection; props: InternalVpcPeeringConstructProps }) {
        const onCreate: AwsSdkCall = {
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
            physicalResourceId: PhysicalResourceId.of(`enableVPCPeeringDNSResolution:${peeringConnection.ref}`),
        };
        const onUpdate = onCreate;
        const onDelete: AwsSdkCall = {
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

        const customResource = new AwsCustomResource(this, 'EnablePeeringDNSResolution', {
            policy: AwsCustomResourcePolicy.fromStatements([
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: ['ec2:ModifyVpcPeeringConnectionOptions'],
                }),
            ]),
            logRetention: logs.RetentionDays.ONE_DAY,
            onCreate,
            onUpdate,
            onDelete,
        });

        customResource.node.addDependency(peeringConnection);
    }
}
