import { AppEvents } from '../events';
import { eventBus } from '../lib/EventBus';
import { stockModel } from '../models/StockModel';
import { fetchAvailableStock } from '../services/moyskladClient';
import type { PriceLevel } from '../types/pricing';

class StockController {
  async load(priceLevel: PriceLevel) {
    stockModel.setLoading(priceLevel);
    eventBus.emit(AppEvents.StockRequested, { priceLevel });
    try {
      const items = await fetchAvailableStock(priceLevel);
      stockModel.setData(priceLevel, items);
      eventBus.emit(AppEvents.StockLoaded, { priceLevel, items });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load stock.';
      stockModel.setError(priceLevel, message);
      eventBus.emit(AppEvents.StockFailed, { priceLevel, message });
    }
  }
}

export const stockController = new StockController();
