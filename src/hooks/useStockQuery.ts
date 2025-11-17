import { useEffect, useSyncExternalStore } from 'react';
import { stockController } from '../controllers/StockController';
import { stockModel } from '../models/StockModel';
import type { PriceLevel } from '../types/pricing';

export function useStockQuery(priceLevel: PriceLevel) {
  const snapshot = useSyncExternalStore(
    stockModel.subscribe,
    stockModel.getSnapshot
  );

  useEffect(() => {
    stockController.load(priceLevel);
  }, [priceLevel]);

  const data = snapshot.priceLevel === priceLevel ? snapshot.items : [];
  const error = snapshot.priceLevel === priceLevel ? snapshot.error : null;
  const loading = snapshot.loading || snapshot.priceLevel !== priceLevel;

  return { data, loading, error };
}
