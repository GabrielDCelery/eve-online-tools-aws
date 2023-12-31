import axios, { AxiosError } from 'axios';
import fs from 'fs';
import { utc } from 'moment';
import path from 'path';
import { stringify } from 'csv-stringify/sync';
import childProcess from 'child_process';
import { EveAPI__MarketOrder__1_0_0 } from '../data-types/generated/eve-api-market-order-1.0.0';
import { PutObjectCommand, S3Client, ServerSideEncryption } from '@aws-sdk/client-s3';

export class EVESectorMarketOrdersDownloader {
    private s3Client: S3Client;
    private s3BucketName: string;

    constructor({ region, s3BucketName }: { region: string; s3BucketName: string }) {
        this.s3Client = new S3Client({ region });
        this.s3BucketName = s3BucketName;
    }

    private getMarketOrdersForSectorAndPage = async ({ sectorID, page }: { sectorID: number; page: number }): Promise<EveAPI__MarketOrder__1_0_0[]> => {
        try {
            const url = `https://esi.evetech.net/latest/markets/${sectorID}/orders/?datasource=tranquility&order_type=all&page=${page}`;
            const response = await axios.get<EveAPI__MarketOrder__1_0_0[]>(url);
            return response.data;
        } catch (error_) {
            const error = error_ as AxiosError;
            if (error.response?.status === 404) {
                return [];
            }
            throw error;
        }
    };

    run = async ({ sectorID }: { sectorID: number }): Promise<void> => {
        const time = utc().format('YYYYMMDDHHmmss');
        const fileBaseName = `${['marketorders', `sector.${sectorID}`, `time.${time}`, 'v1.0.0'].join('__')}`;
        const fileName = `${fileBaseName}.csv`;
        const tempFolder = childProcess.execSync(`mktemp -d`).toString().trim();
        const filePath = path.join(tempFolder, fileName);

        let keepRunning = true;
        let page = 1;

        while (keepRunning) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            const marketOrders = await this.getMarketOrdersForSectorAndPage({ sectorID, page });
            const recordsToSave = marketOrders;
            const shouldSaveHeaders = page === 1;
            const csvData = stringify(recordsToSave, {
                header: shouldSaveHeaders,
                cast: {
                    boolean: (value) => (value === true ? '1' : '0'),
                },
            });
            fs.writeFileSync(filePath, csvData, { flag: 'a' });
            page++;
            keepRunning = marketOrders.length !== 0;
        }

        // const zippedFileName = `${fileBaseName}.tar.gz`;
        // const zippedFilePath = path.join(tempFolder, zippedFileName);

        // childProcess.execSync(`tar czf ${zippedFilePath} -C ${tempFolder} ${fileName}`);

        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: this.s3BucketName,
                Key: fileBaseName,
                Body: Buffer.from(fs.readFileSync(filePath)),
                ServerSideEncryption: ServerSideEncryption.AES256,
            })
        );

        // childProcess.execSync(`cp ${zippedFilePath} ${path.join(this.marketOrdersSaveFolder, zippedFileName)}`);
    };
}
