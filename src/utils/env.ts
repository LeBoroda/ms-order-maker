// DEBUG: Import token from debug config file (temporary debugging measure)
// File is gitignored for security - remove in production
import * as debugConfig from '../config/moysklad.debug';
const debugToken: string | undefined = debugConfig?.MOYSKLAD_TOKEN;

type EnvKey =
  | 'VITE_MOYSKLAD_TOKEN'
  | 'VITE_ORDER_NOTIFICATION_EMAIL';

function readViteEnv(): Record<string, string> | undefined {
  try {
    return (0, eval)('import.meta?.env') as Record<string, string> | undefined;
  } catch {
    return undefined;
  }
}

export function readEnv(key: EnvKey) {
  // DEBUG: For token, check debug file first
  if (key === 'VITE_MOYSKLAD_TOKEN') {
    if (debugToken) {
      console.log('[DEBUG] MoySklad token loaded from debug config file');
      return debugToken;
    }
  }

  // Check Node.js process.env (for testing/server-side)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proc = (globalThis as any).process;
    if (proc?.env && typeof proc.env === 'object' && key in proc.env) {
      return proc.env[key];
    }
  } catch {
    // process not available (browser environment)
  }
  const viteEnv = readViteEnv();
  return viteEnv?.[key];
}
