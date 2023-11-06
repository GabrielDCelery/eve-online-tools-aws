import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
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

        const { vpc: controlSystemsVpc } = new L3.EveOnlineToolsVpcConstruct(this, 'ControlSystemsVpcContruct', {
            cidrBlock: '10.100.0.0/16',
            vpcName: 'controlSystemsVpc',
            vpcRegion: props.env.region,
        });

        const { vpc: testVpc } = new L3.EveOnlineToolsVpcConstruct(this, 'TestVpcConstruct', {
            cidrBlock: '10.110.0.0/16',
            vpcName: 'testVpc',
            vpcRegion: props.env.region,
        });

        const { vpc: prodVpc } = new L3.EveOnlineToolsVpcConstruct(this, 'ProdVpcConstruct', {
            cidrBlock: '10.120.0.0/16',
            vpcName: 'prodVpc',
            vpcRegion: props.env.region,
        });

        new L3.InternalVpcPeeringConstruct(this, 'ControlSystemsToTestVpcPeering', {
            requesterVpc: controlSystemsVpc,
            accepterVpc: testVpc,
            accepterOwnerId: props.env.account,
            accepterRegion: props.env.region,
        });

        new L3.InternalVpcPeeringConstruct(this, 'ControlSystemsToProdVpcPeering', {
            requesterVpc: controlSystemsVpc,
            accepterVpc: prodVpc,
            accepterOwnerId: props.env.account,
            accepterRegion: props.env.region,
        });
    }
}
