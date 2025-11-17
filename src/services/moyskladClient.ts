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

// Actual MoySklad API base URL (used in meta.href for order payloads)
const MOYSKLAD_API_BASE_ACTUAL = 'https://api.moysklad.ru/api/remap/1.2';

// Use proxy in development to avoid CORS issues, direct API in production
const MOYSKLAD_API_BASE =
  import.meta.env.DEV
    ? '/api/moysklad'
    : MOYSKLAD_API_BASE_ACTUAL;

function ensureMoySkladToken() {
  const token = readEnv('VITE_MOYSKLAD_TOKEN');
  if (!token) {
    const errorMsg =
      'Missing MoySklad API token. ' +
      'Please set VITE_MOYSKLAD_TOKEN in your .env file ' +
      'and restart the development server (npm run dev).';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  return token;
}

export function buildMoySkladAuthHeader() {
  const token = ensureMoySkladToken();
  // Try Bearer token first (MoySklad API token format)
  return { Authorization: `Bearer ${token}` };
}

async function moySkladRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = ensureMoySkladToken();
  const url = `${MOYSKLAD_API_BASE}${endpoint}`;
  
  if (import.meta.env.DEV) {
    console.log(`[DEBUG] Making request to: ${url} (via proxy)`);
    console.log(`[DEBUG] Using Bearer token authentication`);
  }
  
  try {
    // Try Bearer token first (most common for API tokens)
    let response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json;charset=utf-8',
        ...options.headers,
      },
    });

    // If Bearer fails with 401, try Basic auth with token as password
    if (response.status === 401) {
      if (import.meta.env.DEV) {
        console.log(`[DEBUG] Bearer token failed, trying Basic auth`);
      }
      const basicAuth = btoa(`:${token}`);
      response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
          Accept: 'application/json;charset=utf-8',
          ...options.headers,
        },
      });
    }

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
            .map((e: unknown) => {
              if (typeof e === 'object' && e !== null) {
                const err = e as { error?: string; message?: string };
                return err.error || err.message || JSON.stringify(e);
              }
              return String(e);
            })
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
      if (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError')
      ) {
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
  // Map to price type groups:
  // basic -> "Прайс основной"
  // level1 -> "Прайс 1 уровень"
  return priceLevel === 'basic' ? 'Прайс основной' : 'Прайс 1 уровень';
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

  // Try partial match for price type groups
  // Match "Прайс основной" or "Прайс 1 уровень"
  const targetLower = targetType.toLowerCase();
  price = salePrices.find((p) => {
    const priceTypeLower = p.priceType.name.toLowerCase();
    // Check if price type name contains the target group name
    if (targetLower.includes('основной') && priceTypeLower.includes('основной')) {
      return true;
    }
    if (targetLower.includes('1 уровень') && priceTypeLower.includes('1 уровень')) {
      return true;
    }
    // Also check for variations like "1-й уровень" or "первый уровень"
    if (targetLower.includes('1 уровень')) {
      return (
        priceTypeLower.includes('1-й уровень') ||
        priceTypeLower.includes('первый уровень') ||
        priceTypeLower.includes('1 уровень')
      );
    }
    return false;
  });
  if (price) return price.value / 100;

  return null;
}

async function fetchAllPages<T>(endpoint: string, limit = 1000): Promise<T[]> {
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
  ensureMoySkladToken();

  try {
    console.log(
      `Fetching products from MoySklad for price level: ${priceLevel}`
    );

    // Fetch products with prices using /entity/product
    const products = await fetchAllPages<MoySkladProduct>('/entity/product');

    if (!products || products.length === 0) {
      console.warn('No products found in MoySklad');
      return [];
    }

    console.log(`Found ${products.length} products`);

    // Fetch stock information separately to get available quantities
    const stockData = await fetchAllPages<MoySkladStock>('/report/stock/all');
    console.log(`Found ${stockData.length} stock entries`);

    // Create a map of product IDs to stock for quick lookup
    const stockMap = new Map<string, MoySkladStock>();
    for (const stock of stockData) {
      if (stock.assortment?.meta?.href) {
        const hrefParts = stock.assortment.meta.href.split('/');
        const productId = hrefParts[hrefParts.length - 1];
        if (productId) {
          stockMap.set(productId, stock);
        }
      }
      // Also try to match by name as fallback
      if (stock.name) {
        const productByName = products.find(
          (p) => p.name && p.name.toLowerCase() === stock.name.toLowerCase()
        );
        if (productByName && !stockMap.has(productByName.id)) {
          stockMap.set(productByName.id, stock);
        }
      }
    }

    // Map price level to MoySklad price type group name
    const targetPriceType = mapPriceLevelToMoySkladType(priceLevel);

    // Process products and filter by price type group
    const stockItems: StockItem[] = [];

    for (const product of products) {
      // Filter: only show products with "Jaws" at the beginning of the name
      const productName = product.name || '';
      const startsWithJaws = productName.trim().startsWith('Jaws');
      
      if (!startsWithJaws) {
        continue;
      }

      // Find the appropriate price for the requested price level (price type group)
      let price = 0;
      if (product.salePrices && product.salePrices.length > 0) {
        const foundPrice = findPriceByType(product.salePrices, targetPriceType);
        if (foundPrice !== null) {
          price = foundPrice;
        } else {
          // Skip products that don't have the required price type group
          continue;
        }
      } else {
        // Skip products without prices
        continue;
      }

      // Get stock information
      const stock = stockMap.get(product.id);
      const available = stock
        ? Math.max(0, (stock.stock || 0) - (stock.reserve || 0))
        : 0;

      // Only include products with available stock
      if (available <= 0) {
        continue;
      }

      const article =
        product.article ||
        stock?.article ||
        stock?.code ||
        stock?.externalCode ||
        '';

      stockItems.push({
        id: product.id,
        name: productName || 'Unnamed Product',
        article,
        available,
        price,
      });
    }

    console.log(
      `Mapped ${stockItems.length} items with valid prices and stock`
    );
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
  ensureMoySkladToken();
  const notificationEmail = getOrderNotificationEmail();

  if (!payload.lines.length) {
    throw new Error('Order must contain at least one line');
  }

  try {
    // Fetch organization (required field)
    const organizations = await moySkladRequest<
      MoySkladResponse<{ id: string; name: string }>
    >('/entity/organization?limit=1');
    
    if (!organizations.rows || organizations.rows.length === 0) {
      throw new Error('No organization found in MoySklad. Please create an organization first.');
    }
    const organization = organizations.rows[0];

    // Fetch or find counterparty (agent) by email
    let counterparty: { id: string; name: string } | null = null;
    try {
      const counterparties = await moySkladRequest<
        MoySkladResponse<{ id: string; name: string; email?: string }>
      >(`/entity/counterparty?filter=email=${encodeURIComponent(payload.customerEmail)}&limit=1`);
      
      if (counterparties.rows && counterparties.rows.length > 0) {
        counterparty = counterparties.rows[0];
      } else {
        // Create new counterparty if not found
        const newCounterparty = await moySkladRequest<{ id: string; name: string }>(
          '/entity/counterparty',
          {
            method: 'POST',
            body: JSON.stringify({
              name: payload.customerEmail,
              email: payload.customerEmail,
            }),
          }
        );
        counterparty = newCounterparty;
      }
    } catch (error) {
      console.warn('Failed to fetch/create counterparty:', error);
      // Try to get first available counterparty as fallback
      try {
        const allCounterparties = await moySkladRequest<
          MoySkladResponse<{ id: string; name: string }>
        >('/entity/counterparty?limit=1');
        if (allCounterparties.rows && allCounterparties.rows.length > 0) {
          counterparty = allCounterparties.rows[0];
        }
      } catch {
        throw new Error('Failed to find or create counterparty (agent) for the order.');
      }
    }

    if (!counterparty) {
      throw new Error('Could not find or create counterparty (agent) for the order.');
    }

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
            href: `${MOYSKLAD_API_BASE_ACTUAL}/entity/product/${line.stockId}`,
            type: 'product',
          },
        },
      };
    });

    // Create customer order in MoySklad with required fields
    const orderData = {
      name: `Заказ от ${payload.customerEmail}`,
      description:
        payload.comment ||
        `Заказ от клиента ${payload.customerEmail}\nEmail: ${payload.customerEmail}`,
      organization: {
        meta: {
          href: `${MOYSKLAD_API_BASE_ACTUAL}/entity/organization/${organization.id}`,
          type: 'organization',
        },
      },
      agent: {
        meta: {
          href: `${MOYSKLAD_API_BASE_ACTUAL}/entity/counterparty/${counterparty.id}`,
          type: 'counterparty',
        },
      },
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

    console.log(
      `Order created in MoySklad: ${createdOrder.name} (ID: ${createdOrder.id})`
    );

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
