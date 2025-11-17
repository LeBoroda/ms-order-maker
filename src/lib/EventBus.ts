type Handler<T = unknown> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<string, Set<Handler>>();

  emit<T = unknown>(event: string, payload: T) {
    const listeners = this.handlers.get(event);
    if (!listeners) return;
    listeners.forEach((handler) => handler(payload));
  }

  on<T = unknown>(event: string, handler: Handler<T>) {
    const listeners = this.handlers.get(event) ?? new Set<Handler>();
    listeners.add(handler as Handler);
    this.handlers.set(event, listeners);
    return () => {
      listeners.delete(handler as Handler);
      if (!listeners.size) {
        this.handlers.delete(event);
      }
    };
  }
}

export const eventBus = new EventBus();
