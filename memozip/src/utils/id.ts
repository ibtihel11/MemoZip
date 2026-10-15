export const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
