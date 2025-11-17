import { AppEvents } from '../events';
import { eventBus } from '../lib/EventBus';

eventBus.on(AppEvents.AuthLogin, (user) => {
  console.info('[EventBus] User logged in', user);
});

eventBus.on(AppEvents.AuthLogout, () => {
  console.info('[EventBus] User logged out');
});

eventBus.on(AppEvents.StockRequested, (payload) => {
  console.info('[EventBus] Stock requested', payload);
});

eventBus.on(AppEvents.StockLoaded, (payload) => {
  console.info('[EventBus] Stock loaded', payload);
});

eventBus.on(AppEvents.StockFailed, (payload) => {
  console.warn('[EventBus] Stock failed', payload);
});

eventBus.on(AppEvents.OrderSubmitted, (order) => {
  console.info('[EventBus] Order submitted', order);
});

