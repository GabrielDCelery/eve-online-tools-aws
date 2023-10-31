import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { AllowVPCPeeringDNSResolution } from './allow-vpc-peering-resolution';

export interface InternalVpcPeeringConstructProps {
    requesterVpc: ec2.Vpc;
    sourceAccountId: string;
    accepterVpc: ec2.Vpc;
    accepterOwnerId: string;
    accepterRegion: string;
}

export class InternalVpcPeeringConstruct extends Construct {
    constructor(scope: Construct, id: string, props: InternalVpcPeeringConstructProps) {
        super(scope, id);

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

        props.requesterVpc.privateSubnets.forEach(({ routeTable: { routeTableId } }, index) => {
            const route = new ec2.CfnRoute(this, 'PrivateSubnetPeeringConnectionRoute' + index, {
                destinationCidrBlock: props.accepterVpc.vpcCidrBlock,
                routeTableId,
                vpcPeeringConnectionId: peeringConnection.ref,
            });
            route.addDependency(peeringConnection);
        });

        new AllowVPCPeeringDNSResolution(this, 'PeerConnectionDnsResolution', { vpcPeering: peeringConnection });
    }
}
