import { EVESectorMarketOrdersDownloader } from './eve-sector-market-orders-downloader';
import { SQSMessageRetriever, SQSRequest } from './sqs-message-retriever';
import Bluebird from 'bluebird';

type DownloadSectorMarketOrdersRequest = { sectorID: number };

export class EVEMarketOrdersDownloader {
    private sqsMessageRetriever: SQSMessageRetriever;
    private eveSectorMarketOrdersDownloader: EVESectorMarketOrdersDownloader;

    constructor({ region, sqsQueueUrl, marketOrdersSaveFolder }: { region: string; sqsQueueUrl: string; marketOrdersSaveFolder: string }) {
        this.sqsMessageRetriever = new SQSMessageRetriever({ region, sqsQueueUrl });
        this.eveSectorMarketOrdersDownloader = new EVESectorMarketOrdersDownloader({ marketOrdersSaveFolder });
    }

    run = async () => {
        let keepRunning = true;

        while (keepRunning) {
            const sqsRequests = await this.sqsMessageRetriever.getNextBatchOfRequestsFromQueue<DownloadSectorMarketOrdersRequest>();

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

            await this.sqsMessageRetriever.removeRequestsFromQueue({ sqsRequests: sqsRequestsSuccessfullyProcessed });
        }
    };
}
