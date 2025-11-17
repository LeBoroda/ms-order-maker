import type { StockItem } from '../services/moyskladClient';
import type { PriceLevel } from '../types/pricing';

type Listener = () => void;

interface StockState {
  items: StockItem[];
  loading: boolean;
  error: string | null;
  priceLevel: PriceLevel;
}

const defaultState: StockState = {
  items: [],
  loading: false,
  error: null,
  priceLevel: 'basic',
};

class StockModel {
  private state: StockState = defaultState;

  private listeners = new Set<Listener>();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;

  setLoading = (priceLevel: PriceLevel) => {
    this.state = { ...this.state, loading: true, error: null, priceLevel };
    this.emit();
  };

  setData = (priceLevel: PriceLevel, items: StockItem[]) => {
    this.state = { items, loading: false, error: null, priceLevel };
    this.emit();
  };

  setError = (priceLevel: PriceLevel, message: string) => {
    this.state = { ...this.state, loading: false, error: message, priceLevel };
    this.emit();
  };

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}

export const stockModel = new StockModel();
