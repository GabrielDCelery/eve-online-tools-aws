import * as SYSTEM_UNDER_TEST from '../src/scripts/download-market-orders-for-sector';

describe('Default test', () => {
    test('Runs', async () => {
        await SYSTEM_UNDER_TEST.downloadMarketOrdersForSector({ sectorID: 10000020, marketOrdersSaveFolder: '/temp' });
        expect(true).toEqual(true);
    });
});
