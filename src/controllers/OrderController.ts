import { AppEvents } from '../events';
import { eventBus } from '../lib/EventBus';
import { addOrder } from '../services/orderHistory';
import {
  submitSalesOrder,
  type StockItem,
  type OrderPayload,
} from '../services/moyskladClient';

interface SubmitParams {
  customerEmail: string;
  comment: string;
  lines: Array<{ item: StockItem; quantity: number }>;
}

class OrderController {
  async submit({ customerEmail, comment, lines }: SubmitParams) {
    const payload: OrderPayload = {
      customerEmail,
      comment,
      lines: lines.map(({ item, quantity }) => ({
        stockId: item.id,
        quantity,
      })),
    };

    await submitSalesOrder(payload);

    const saved = addOrder(customerEmail, {
      comment,
      lines: lines.map(({ item, quantity }) => ({
        id: item.id,
        name: item.name,
        quantity,
      })),
    });

    eventBus.emit(AppEvents.OrderSubmitted, saved);

    return saved;
  }
}

export const orderController = new OrderController();
