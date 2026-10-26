const toCamel = (key: string) => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const toSnake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

function mapKeys(value: unknown, fn: (key: string) => string): unknown {
  if (Array.isArray(value)) return value.map((v) => mapKeys(v, fn));
  if (value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [fn(k), mapKeys(v, fn)]));
  }
  return value;
}

/** API responses use snake_case (file_name); the UI uses camelCase (fileName). */
export const camelizeKeys = <T = unknown>(value: unknown): T => mapKeys(value, toCamel) as T;
/** Request bodies go the other way. */
export const snakeizeKeys = <T = unknown>(value: unknown): T => mapKeys(value, toSnake) as T;
