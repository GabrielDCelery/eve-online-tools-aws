import { SQSMessageRetriever } from './sqs-message-retriever';

export class EVEMarketOrdersDownloadRequestor {
    private sqsMessageRetriever: SQSMessageRetriever;

    constructor({ region, sqsQueueUrl }: { region: string; sqsQueueUrl: string }) {
        this.sqsMessageRetriever = new SQSMessageRetriever({ region, sqsQueueUrl });
    }

    run = async () => {
        await this.sqsMessageRetriever.sendMessageToQueue({ message: { MessageBody: JSON.stringify({ sectorID: 10000020 }) } });
    };
}
