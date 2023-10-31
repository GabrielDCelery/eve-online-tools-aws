import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as L2 from './l2';
import * as L3 from './l3';

interface EveOnlineToolsStackProps extends cdk.StackProps {
    env: {
        account: string;
        region: string;
    };
}

export class EveOnlineToolsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: EveOnlineToolsStackProps) {
        super(scope, id, props);

        const controlSystemsVpc = new L2.EveOnlineToolsVpc(this, 'ControlSystemsVpc', {
            cidrBlock: '10.100.0.0/16',
            vpcName: 'ControlSystemsVpc',
        });

        const testVpc = new L2.EveOnlineToolsVpc(this, 'TestVpc', {
            cidrBlock: '10.110.0.0/16',
            vpcName: 'TestVpc',
        });

        const prodVpc = new L2.EveOnlineToolsVpc(this, 'ProdVpc', {
            cidrBlock: '10.120.0.0/16',
            vpcName: 'ProdVpc',
        });

        new L3.InternalVpcPeeringConstruct(this, 'ControlSystemsToTestVpcPeering', {
            requesterVpc: controlSystemsVpc,
            accepterVpc: testVpc,
            accepterOwnerId: props.env.account,
            accepterRegion: props.env.region,
        });
    }
}
