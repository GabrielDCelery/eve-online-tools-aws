import fs from 'fs';
import moment from 'moment';
import path from 'path';
import 'dotenv/config';
import { getMarketOrders } from './get-market-orders';
import { stringify } from 'csv-stringify/sync';
import { validateAndGetEnvVariable } from './common';
import childProcess from 'child_process';

const handler = async () => {
    const sectorIDs = validateAndGetEnvVariable({ name: 'SECTOR_IDS_TO_GET_MARKET_ORDERS_FOR' }).split(',').map(parseInt);
    const marketOrdersSaveFolder = validateAndGetEnvVariable({ name: 'EVE_API_MARKET_ORDERS_SAVE_FOLDER' });
    const tempFolder = validateAndGetEnvVariable({ name: 'TEMP_FOLDER' });

    const nowMoment = moment.utc();
    const time = nowMoment.format('YYYYMMDDHHmmss');

    for (const sectorID of sectorIDs) {
        const fileBaseName = `${['marketorders', `sector.${sectorID}`, `time.${time}`, 'v1.0.0'].join('__')}`;
        const fileName = `${fileBaseName}.csv`;
        const filePath = path.join(tempFolder, fileName);

        let keepRunning = true;
        let page = 1;

        while (keepRunning) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            const marketOrders = await getMarketOrders({ sectorID, page });
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

        const zippedFileName = `${fileBaseName}.tar.gz`;
        const zippedFilePath = path.join(tempFolder, zippedFileName);

        childProcess.execSync(`tar czf ${zippedFilePath} -C ${tempFolder} ${fileName}`);
        childProcess.execSync(`cp ${zippedFilePath} ${path.join(marketOrdersSaveFolder, zippedFileName)}`);
    }
};

async () => {
    await handler();
};
