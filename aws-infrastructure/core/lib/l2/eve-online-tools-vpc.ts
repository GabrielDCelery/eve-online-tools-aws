import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface EveOnlineToolsVpcProps {
    cidrBlock: string;
    vpcName: string;
}

export class EveOnlineToolsVpc extends ec2.Vpc {
    constructor(scope: Construct, id: string, props: EveOnlineToolsVpcProps) {
        super(scope, id, {
            ipAddresses: ec2.IpAddresses.cidr(props.cidrBlock),
            maxAzs: 3,
            natGateways: 0,
            subnetConfiguration: [
                {
                    cidrMask: 20,
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 20,
                    name: 'Private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
                {
                    cidrMask: 20,
                    name: 'Isolated',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
            ],
            vpcName: props.vpcName,
            restrictDefaultSecurityGroup: true,
        });
    }
}
