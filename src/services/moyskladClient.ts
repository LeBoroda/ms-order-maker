import type { PriceLevel } from '../types/pricing';
import { readEnv } from '../utils/env';

export interface StockItem {
  id: string;
  name: string;
  article: string;
  available: number;
  price: number;
}

export interface OrderLineInput {
  stockId: string;
  quantity: number;
}

export interface OrderPayload {
  customerEmail: string;
  comment?: string;
  lines: OrderLineInput[];
}

// MoySklad API types
interface MoySkladProduct {
  id: string;
  name: string;
  article?: string;
  salePrices?: Array<{
    priceType: {
      name: string;
    };
    value: number;
  }>;
}

interface MoySkladStock {
  stock: number;
  reserve: number;
  inTransit: number;
  quantity: number;
  name: string;
  code?: string;
  article?: string;
  externalCode?: string;
  assortment?: {
    meta: {
      href: string;
      type: string;
    };
  };
}

interface MoySkladResponse<T> {
  rows: T[];
  meta: {
    size: number;
    limit: number;
    offset: number;
  };
}

const MOYSKLAD_API_BASE = 'https://api.moysklad.ru/api/remap/1.2';

function ensureMoySkladCredentials() {
  const login = readEnv('VITE_MOYSKLAD_LOGIN');
  const password = readEnv('VITE_MOYSKLAD_PASSWORD');
  if (!login || !password) {
    throw new Error(
      'Missing MoySklad credentials. Set VITE_MOYSKLAD_LOGIN and VITE_MOYSKLAD_PASSWORD.'
    );
  }
  return { login, password };
}

export function buildMoySkladAuthHeader() {
  const creds = ensureMoySkladCredentials();
  if (!creds) return {};
  const token = btoa(`${creds.login}:${creds.password}`);
  return { Authorization: `Basic ${token}` };
}

async function moySkladRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const creds = ensureMoySkladCredentials();
  const authToken = btoa(`${creds.login}:${creds.password}`);

  const url = `${MOYSKLAD_API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Basic ${authToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `MoySklad API error: ${response.status} ${response.statusText}`;
      
      // Handle authentication errors
      if (response.status === 401) {
        throw new Error(
          'MoySklad authentication failed. Please check your credentials in .env file.'
        );
      }
      
      // Handle rate limiting
      if (response.status === 429) {
        throw new Error(
          'MoySklad API rate limit exceeded. Please try again later.'
        );
      }
      
      try {
        const errorData = await response.json();
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorDetails = errorData.errors
            .map((e: any) => e.error || e.message || JSON.stringify(e))
            .join(', ');
          errorMessage += `. ${errorDetails}`;
        } else if (errorData.error) {
          errorMessage += `. ${errorData.error}`;
        }
      } catch {
        const errorText = await response.text();
        if (errorText) {
          errorMessage += `. ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      // Check for network/CORS errors
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error(
          'Network error: Unable to connect to MoySklad API. Please check your internet connection and CORS settings.'
        );
      }
      throw error;
    }
    throw new Error(`Network error while calling MoySklad API: ${endpoint}`);
  }
}

function mapPriceLevelToMoySkladType(priceLevel: PriceLevel): string {
  // MoySklad price types: "Цена продажи" (basic), "Цена продажи 1" (level1), etc.
  // Also try common variations
  return priceLevel === 'basic' ? 'Цена продажи' : 'Цена продажи 1';
}

function findPriceByType(
  salePrices: Array<{ priceType: { name: string }; value: number }>,
  targetType: string
): number | null {
  // Try exact match first
  let price = salePrices.find((p) => p.priceType.name === targetType);
  if (price) return price.value / 100;

  // Try case-insensitive match
  price = salePrices.find(
    (p) => p.priceType.name.toLowerCase() === targetType.toLowerCase()
  );
  if (price) return price.value / 100;

  // Try partial match for "Цена продажи"
  if (targetType.includes('продажи')) {
    price = salePrices.find((p) =>
      p.priceType.name.toLowerCase().includes('продажи')
    );
    if (price) return price.value / 100;
  }

  return null;
}

async function fetchAllPages<T>(
  endpoint: string,
  limit = 1000
): Promise<T[]> {
  const allItems: T[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await moySkladRequest<MoySkladResponse<T>>(
      `${endpoint}${endpoint.includes('?') ? '&' : '?'}limit=${limit}&offset=${offset}`
    );

    if (response.rows && response.rows.length > 0) {
      allItems.push(...response.rows);
      offset += response.rows.length;
      hasMore = response.rows.length === limit;
    } else {
      hasMore = false;
    }
  }

  return allItems;
}

export async function fetchAvailableStock(
  priceLevel: PriceLevel
): Promise<StockItem[]> {
  ensureMoySkladCredentials();

  try {
    console.log(`Fetching stock data from MoySklad for price level: ${priceLevel}`);

    // Fetch products with stock information using /report/stock/all
    // This endpoint returns products with their current stock levels
    const stockData = await fetchAllPages<MoySkladStock>('/report/stock/all');

    if (!stockData || stockData.length === 0) {
      console.warn('No stock data found in MoySklad');
      return [];
    }

    console.log(`Found ${stockData.length} stock entries`);

    // Fetch products to get pricing and article information
    const products = await fetchAllPages<MoySkladProduct>('/entity/product');

    console.log(`Found ${products.length} products`);

    // Create a map of product IDs to products for quick lookup
    const productMap = new Map<string, MoySkladProduct>();
    products.forEach((product) => {
      productMap.set(product.id, product);
    });

    // Map price level to MoySklad price type name
    const targetPriceType = mapPriceLevelToMoySkladType(priceLevel);

    // Combine stock and product data
    const stockItems: StockItem[] = [];

    for (const stock of stockData) {
      let product: MoySkladProduct | undefined;

      // Try to find product by ID from assortment href
      if (stock.assortment?.meta?.href) {
        const hrefParts = stock.assortment.meta.href.split('/');
        const productId = hrefParts[hrefParts.length - 1];
        if (productId) {
          product = productMap.get(productId);
        }
      }

      // Fallback: try to find by name (case-insensitive)
      if (!product && stock.name) {
        product = Array.from(productMap.values()).find(
          (p) => p.name && p.name.toLowerCase() === stock.name.toLowerCase()
        );
      }

      // Skip if no product found
      if (!product) {
        continue;
      }

      // Find the appropriate price for the requested price level
      let price = 0;
      if (product.salePrices && product.salePrices.length > 0) {
        const foundPrice = findPriceByType(product.salePrices, targetPriceType);
        if (foundPrice !== null) {
          price = foundPrice;
        } else if (product.salePrices[0]) {
          // Fallback to first available price
          price = product.salePrices[0].value / 100;
        }
      }

      // Only include items with valid price and stock
      if (price > 0) {
        const available = Math.max(0, (stock.stock || 0) - (stock.reserve || 0));
        const article =
          product.article || stock.article || stock.code || stock.externalCode || '';

        stockItems.push({
          id: product.id,
          name: product.name || stock.name || 'Unnamed Product',
          article,
          available,
          price,
        });
      }
    }

    console.log(`Mapped ${stockItems.length} items with valid prices and stock`);
    return stockItems;
  } catch (error) {
    console.error('Failed to fetch stock from MoySklad:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to fetch stock from MoySklad API';
    throw new Error(errorMessage);
  }
}

export function getOrderNotificationEmail(): string {
  const email = readEnv('VITE_ORDER_NOTIFICATION_EMAIL');
  if (!email) {
    console.warn(
      'Missing order notification email. Set VITE_ORDER_NOTIFICATION_EMAIL.'
    );
    return '';
  }
  return email;
}

export async function submitSalesOrder(payload: OrderPayload): Promise<void> {
  ensureMoySkladCredentials();
  const notificationEmail = getOrderNotificationEmail();

  if (!payload.lines.length) {
    throw new Error('Order must contain at least one line');
  }

  try {
    // First, fetch product details to get prices
    const productIds = payload.lines.map((line) => line.stockId);
    const productPromises = productIds.map((id) =>
      moySkladRequest<MoySkladProduct>(`/entity/product/${id}`)
    );
    const products = await Promise.all(productPromises);

    // Create order positions with prices
    const positions = payload.lines.map((line, index) => {
      const product = products[index];
      const price =
        product.salePrices && product.salePrices.length > 0
          ? product.salePrices[0].value / 100
          : 0;

      return {
        quantity: line.quantity,
        price: price * 100, // Convert to kopecks for API
        discount: 0,
        vat: 0,
        assortment: {
          meta: {
            href: `${MOYSKLAD_API_BASE}/entity/product/${line.stockId}`,
            type: 'product',
          },
        },
      };
    });

    // Create customer order in MoySklad
    const orderData = {
      name: `Заказ от ${payload.customerEmail}`,
      description:
        payload.comment ||
        `Заказ от клиента ${payload.customerEmail}\nEmail: ${payload.customerEmail}`,
      positions,
    };

    // Create the order in MoySklad
    const createdOrder = await moySkladRequest<{ id: string; name: string }>(
      '/entity/customerorder',
      {
        method: 'POST',
        body: JSON.stringify(orderData),
      }
    );

    console.log(`Order created in MoySklad: ${createdOrder.name} (ID: ${createdOrder.id})`);

    // Send notification email (in production, this would use an email service)
    if (notificationEmail) {
      const orderSummary = payload.lines
        .map((line, index) => {
          const product = products[index];
          return `- ${product?.name || line.stockId}: ${line.quantity} шт.`;
        })
        .join('\n');

      // In production, integrate with email service (SendGrid, AWS SES, etc.)
      console.log(
        `Order notification should be sent to ${notificationEmail}:\n` +
          `Order ID: ${createdOrder.id}\n` +
          `Customer: ${payload.customerEmail}\n` +
          `Comment: ${payload.comment || 'No comment'}\n` +
          `Items:\n${orderSummary}`
      );
    }
  } catch (error) {
    console.error('Failed to submit order to MoySklad:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to submit order to MoySklad API';
    throw new Error(errorMessage);
  }
}
