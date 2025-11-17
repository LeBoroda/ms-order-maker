export interface OrderLineSnapshot {
  id: string;
  name: string;
  quantity: number;
}

export interface SavedOrder {
  id: string;
  createdAt: string;
  customerEmail: string;
  comment?: string;
  lines: OrderLineSnapshot[];
}

const STORAGE_KEY = 'ms-order-history-v2';

type HistoryStore = Record<string, SavedOrder[]>;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readStore(): HistoryStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as HistoryStore;
    }
    return {};
  } catch (error) {
    console.warn('Failed to read order history from localStorage', error);
    return {};
  }
}

function writeStore(store: HistoryStore) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function loadOrders(email: string): SavedOrder[] {
  const store = readStore();
  const key = normalizeEmail(email);
  return store[key] ?? [];
}

export function addOrder(
  email: string,
  entry: Omit<SavedOrder, 'id' | 'createdAt' | 'customerEmail'>
) {
  const store = readStore();
  const key = normalizeEmail(email);
  const bucket = store[key] ?? [];
  const newEntry: SavedOrder = {
    ...entry,
    customerEmail: email,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  store[key] = [newEntry, ...bucket];
  writeStore(store);
  return newEntry;
}

export function clearOrders(email?: string) {
  if (!email) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  const store = readStore();
  const key = normalizeEmail(email);
  if (store[key]) {
    delete store[key];
    writeStore(store);
  }
}
