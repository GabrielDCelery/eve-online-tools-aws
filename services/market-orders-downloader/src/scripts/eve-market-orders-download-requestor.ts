import { SQSMessageRetriever } from './sqs-message-retriever';
import Bluebird from 'bluebird';

type DownloadSectorMarketOrdersRequest = { sectorID: number };

export class EVEMarketOrdersDownloadRequestor {
    private eveSectorMarketOrdersRequestsRetriever: SQSMessageRetriever<DownloadSectorMarketOrdersRequest>;

    constructor({ region, sqsQueueUrl }: { region: string; sqsQueueUrl: string }) {
        this.eveSectorMarketOrdersRequestsRetriever = new SQSMessageRetriever({ region, sqsQueueUrl });
    }

    run = async () => {
        const sectorIDs = [10000020];

        await Bluebird.map(
            sectorIDs,
            async (sectorID) => {
                await this.eveSectorMarketOrdersRequestsRetriever.sendMessageToQueue({ message: { MessageBody: JSON.stringify({ sectorID: sectorID }) } });
            },
            { concurrency: 3 }
        );
    };
}
