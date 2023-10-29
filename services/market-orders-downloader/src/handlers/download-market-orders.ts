import express from 'express';
import { EnvVariableRetriever } from '../common';
import { EVEMarketOrdersDownloader } from '../scripts';

const env = new EnvVariableRetriever();

const region = env.validateAndGetEnvVariable({ name: 'AWS_REGION' });
const sqsQueueUrl = env.validateAndGetEnvVariable({ name: 'SQS_QUEUE_URL' });
const marketOrdersSaveFolder = env.validateAndGetEnvVariable({ name: 'MARKET_ORDERS_SAVE_FOLDER' });

const marketOrdersDownloader = new EVEMarketOrdersDownloader({ region, sqsQueueUrl, marketOrdersSaveFolder });

const app = express();

const server = app.listen(8080, () => {
    (async () => {
        await marketOrdersDownloader.run();
        server.close((err) => process.exit(err ? 1 : 0));
    })().catch(() => {
        server.close((err) => process.exit(err ? 1 : 0));
    });
});
