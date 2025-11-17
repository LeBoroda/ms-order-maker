type EnvKey =
  | 'VITE_MOYSKLAD_LOGIN'
  | 'VITE_MOYSKLAD_PASSWORD'
  | 'VITE_ORDER_NOTIFICATION_EMAIL';

function readViteEnv(): Record<string, string> | undefined {
  try {
    return (0, eval)('import.meta?.env') as Record<string, string> | undefined;
  } catch {
    return undefined;
  }
}

export function readEnv(key: EnvKey) {
  if (typeof process !== 'undefined' && process.env && key in process.env) {
    return process.env[key];
  }
  const viteEnv = readViteEnv();
  return viteEnv?.[key];
}
