import axios, { AxiosError } from 'axios';
import { EveAPIMarketOrder } from './data-types/eve-api-market-order';

export const getMarketOrders = async ({ sectorID, page }: { sectorID: number; page: number }): Promise<EveAPIMarketOrder[]> => {
    try {
        const url = `https://esi.evetech.net/latest/markets/${sectorID}/orders/?datasource=tranquility&order_type=all&page=${page}`;
        const response = await axios.get<EveAPIMarketOrder[]>(url);
        return response.data;
    } catch (error_) {
        const error = error_ as AxiosError;
        if (error.response?.status === 404) {
            return [];
        }
        throw error;
    }
};
