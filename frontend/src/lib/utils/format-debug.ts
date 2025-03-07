export function formatDebug(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(formatDebug);
  }

  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      typeof value === 'bigint' ? value.toString() : formatDebug(value),
    ]),
  );
}
