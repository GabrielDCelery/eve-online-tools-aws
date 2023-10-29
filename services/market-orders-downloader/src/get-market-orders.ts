import axios, { AxiosError } from 'axios';
import { EveAPI__MarketOrder__1_0_0 } from './data-types/generated/eve-api-market-order/eve-api-market-order-1.0.0';

export const getMarketOrders = async ({ sectorID, page }: { sectorID: number; page: number }): Promise<EveAPI__MarketOrder__1_0_0[]> => {
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
