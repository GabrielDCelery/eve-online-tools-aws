import { EVESectorMarketOrdersDownloader } from './eve-sector-market-orders-downloader';
import { SQSMessageRetriever, SQSRequest } from './sqs-message-retriever';
import Bluebird from 'bluebird';

type DownloadSectorMarketOrdersRequest = { sectorID: number };

export class EVEMarketOrdersDownloader {
    private eveSectorMarketOrdersRequestsRetriever: SQSMessageRetriever<DownloadSectorMarketOrdersRequest>;
    private eveSectorMarketOrdersDownloader: EVESectorMarketOrdersDownloader;

    constructor({ region, sqsQueueUrl, s3BucketName }: { region: string; sqsQueueUrl: string; s3BucketName: string }) {
        this.eveSectorMarketOrdersRequestsRetriever = new SQSMessageRetriever({ region, sqsQueueUrl });
        this.eveSectorMarketOrdersDownloader = new EVESectorMarketOrdersDownloader({ region, s3BucketName });
    }

    run = async () => {
        let keepRunning = true;

        while (keepRunning) {
            const sqsRequests = await this.eveSectorMarketOrdersRequestsRetriever.getNextBatchOfRequestsFromQueue();

            if (sqsRequests.length === 0) {
                keepRunning = false;
                continue;
            }

            const sqsRequestsSuccessfullyProcessed: SQSRequest[] = [];
            const sqsRequestsFailedToProcess: SQSRequest[] = [];

            await Bluebird.map(
                sqsRequests,
                async (sqsRequest) => {
                    try {
                        await this.eveSectorMarketOrdersDownloader.run({ sectorID: sqsRequest.payload.sectorID });
                        sqsRequestsSuccessfullyProcessed.push(sqsRequest);
                    } catch (error_) {
                        sqsRequestsFailedToProcess.push(sqsRequest);
                    }
                },
                { concurrency: 3 }
            );

            await this.eveSectorMarketOrdersRequestsRetriever.removeRequestsFromQueue({ sqsRequests: sqsRequestsSuccessfullyProcessed });
        }
    };
}
