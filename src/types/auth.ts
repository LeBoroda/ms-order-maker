import type { PriceLevel } from './pricing';

export interface UserProfile {
  email: string;
  priceLevel: PriceLevel;
}
