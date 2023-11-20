import express from 'express';
import { EnvVariableRetriever } from '../common';
import { EVEMarketOrdersDownloadRequestor } from '../scripts';

const env = new EnvVariableRetriever();

const region = env.validateAndGetEnvVariable({ name: 'AWS_REGION' });
const sqsQueueUrl = env.validateAndGetEnvVariable({ name: 'SQS_QUEUE_URL' });

const marketOrdersDownloadRequestor = new EVEMarketOrdersDownloadRequestor({ region, sqsQueueUrl });

const app = express();

const server = app.listen(8080, () => {
    (async () => {
        await marketOrdersDownloadRequestor.run();
        server.close((err) => process.exit(err ? 1 : 0));
    })().catch(() => {
        server.close((err) => process.exit(err ? 1 : 0));
    });
});
