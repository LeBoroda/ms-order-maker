export const AppEvents = {
  AuthLogin: 'auth:login',
  AuthLogout: 'auth:logout',
  StockRequested: 'stock:requested',
  StockLoaded: 'stock:loaded',
  StockFailed: 'stock:failed',
  OrderSubmitted: 'order:submitted',
} as const;

export type AppEventKey = (typeof AppEvents)[keyof typeof AppEvents];

