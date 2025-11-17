import { MemoryRouter } from 'react-router-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

const mockStock = [
  {
    id: 'sku-1',
    name: 'Test SKU',
    article: 'SKU-1',
    available: 10,
    price: 1000,
  },
];

jest.mock('../services/moyskladClient', () => ({
  fetchAvailableStock: jest.fn(),
  submitSalesOrder: jest.fn(),
}));

const { fetchAvailableStock, submitSalesOrder } = jest.requireMock(
  '../services/moyskladClient'
) as {
  fetchAvailableStock: jest.Mock;
  submitSalesOrder: jest.Mock;
};

function renderApp(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>
  );
}

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('MS Order Maker UI', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
    fetchAvailableStock.mockResolvedValue(mockStock);
    submitSalesOrder.mockResolvedValue(undefined);
  });

  it('fetches the basic price list for smallbar', async () => {
    renderApp();
    await userEvent.type(
      screen.getByLabelText(/work email/i),
      'smallbar@beer.ru'
    );

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await flushPromises();
    });

    expect(fetchAvailableStock).toHaveBeenCalledWith('basic');
    expect(
      await screen.findByRole('heading', { name: /available stock/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/quantity for test sku/i)).toBeInTheDocument();
  });

  it('rejects unknown emails', async () => {
    renderApp();
    await userEvent.type(
      screen.getByLabelText(/work email/i),
      'unknown@example.com'
    );

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await flushPromises();
    });

    expect(
      screen.getByText(
        /login is incorrect\. please use a valid company email\./i
      )
    ).toBeInTheDocument();
    expect(fetchAvailableStock).not.toHaveBeenCalled();
  });

  it('fetches price level 1 for bigbar', async () => {
    renderApp();
    await userEvent.type(
      screen.getByLabelText(/work email/i),
      'bigbar@beer.ru'
    );

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await flushPromises();
    });

    expect(fetchAvailableStock).toHaveBeenCalledWith('level1');
  });

  it('persists orders to history after submission', async () => {
    renderApp();
    await userEvent.type(
      screen.getByLabelText(/work email/i),
      'smallbar@beer.ru'
    );
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await flushPromises();
    });

    const qtyInput = await screen.findByLabelText(/quantity for test sku/i);
    await userEvent.type(qtyInput, '3');
    await userEvent.type(screen.getByLabelText(/comment/i), 'Urgent restock');

    await act(async () => {
      await userEvent.click(
        screen.getByRole('button', { name: /send order/i })
      );
      await flushPromises();
    });

    expect(submitSalesOrder).toHaveBeenCalledWith({
      customerEmail: 'smallbar@beer.ru',
      comment: 'Urgent restock',
      lines: [{ stockId: 'sku-1', quantity: 3 }],
    });

    expect(
      await screen.findByText(/order sent to the sales department/i)
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('link', { name: /previous orders/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/test sku × 3/i)).toBeInTheDocument();
    });
  });
});
