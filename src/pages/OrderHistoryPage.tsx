import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loadOrders, type SavedOrder } from '../services/orderHistory';

export default function OrderHistoryPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<SavedOrder[]>([]);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }
    setOrders(loadOrders(user.email));
  }, [user]);

  return (
    <section className="page history-page">
      <header>
        <h2>Previous orders</h2>
        <p>
          Stored locally per account to help you repeat typical requests faster.
        </p>
      </header>

      {!user ? (
        <div className="card">
          <p>Sign in to view your order history.</p>
        </div>
      ) : !orders.length ? (
        <div className="card">
          <p>No orders saved yet. Send your first order to see it here.</p>
        </div>
      ) : (
        <div className="history-list">
          {orders.map((order) => (
            <article key={order.id} className="card history-card">
              <header>
                <h3>{new Date(order.createdAt).toLocaleString()}</h3>
                <p>{order.customerEmail}</p>
              </header>
              <ul>
                {order.lines.map((line) => (
                  <li key={line.id}>
                    {line.name} × {line.quantity}
                  </li>
                ))}
              </ul>
              {order.comment && (
                <p className="history-comment">{order.comment}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
