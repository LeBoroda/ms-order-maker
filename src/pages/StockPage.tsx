import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { orderController } from '../controllers/OrderController';
import { useAuth } from '../context/AuthContext';
import { useStockQuery } from '../hooks/useStockQuery';
import type { StockItem } from '../services/moyskladClient';

type OrderFormState = Record<string, number>;

function buildOrderLines(stock: StockItem[], formState: OrderFormState) {
  return stock
    .map((item) => ({
      item,
      quantity: formState[item.id] ?? 0,
    }))
    .filter(({ quantity }) => quantity > 0);
}

export default function StockPage() {
  const { user } = useAuth();
  const priceLevel = user?.priceLevel ?? 'basic';
  const { data: stock, loading, error } = useStockQuery(priceLevel);
  const [quantities, setQuantities] = useState<OrderFormState>({});
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  // Filter to show only products with available stock
  const availableStock = useMemo(
    () => stock.filter((item) => item.available > 0),
    [stock]
  );

  const lines = useMemo(
    () => buildOrderLines(availableStock, quantities),
    [availableStock, quantities]
  );

  const totalPositions = lines.reduce(
    (acc, { quantity, item }) => ({
      units: acc.units + quantity,
      value: acc.value + quantity * item.price,
    }),
    { units: 0, value: 0 }
  );

  const handleQtyChange = (id: string, value: number) => {
    setQuantities((prev) => {
      const next = { ...prev };
      if (!value) {
        delete next[id];
      } else {
        next[id] = value;
      }
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    if (!lines.length) {
      setStatus('Add at least one position to send an order.');
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      await orderController.submit({
        customerEmail: user.email,
        comment,
        lines,
      });
      setQuantities({});
      setComment('');
      setStatus('Order sent to the sales department.');
    } catch (submitError) {
      setStatus(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to submit order.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page stock-page">
      <header>
        <h2>Available stock</h2>
        <p>Fill in the quantities you need and send the order to sales.</p>
        <p className="hint">
          Showing{' '}
          {priceLevel === 'basic' ? 'basic price list' : 'price level 1'} for{' '}
          {user?.email}.
        </p>
      </header>

      {loading && <p>Loading stock...</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}

      {!loading && !error && (
        <form className="card" onSubmit={handleSubmit} aria-label="Order form">
          <div className="stock-table" role="table">
            <div className="stock-row stock-row--head" role="row">
              <span role="columnheader">Name</span>
              <span role="columnheader">Available</span>
              <span role="columnheader">Price, ₽</span>
              <span role="columnheader">Quantity</span>
            </div>

            {availableStock.map((item) => (
              <div key={item.id} className="stock-row" role="row">
                <span role="cell">{item.name}</span>
                <span role="cell">{item.available}</span>
                <span role="cell">{item.price.toLocaleString('ru-RU')}</span>
                <span role="cell">
                  <input
                    type="number"
                    min={0}
                    max={item.available}
                    value={quantities[item.id] ?? ''}
                    onChange={(event) => {
                      const raw = event.target.value;
                      const numericValue = raw === '' ? 0 : Number(raw);
                      handleQtyChange(item.id, numericValue);
                    }}
                    aria-label={`Quantity for ${item.name}`}
                  />
                </span>
              </div>
            ))}
          </div>

          <label>
            Comment for sales (optional)
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
            />
          </label>

          <div className="order-summary">
            <p>
              Total units: <strong>{totalPositions.units}</strong>
            </p>
            <p>
              Order value:{' '}
              <strong>{totalPositions.value.toLocaleString('ru-RU')} ₽</strong>
            </p>
          </div>

          {status && (
            <p role="status" className="form-message">
              {status}
            </p>
          )}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send order'}
          </button>
        </form>
      )}
    </section>
  );
}
