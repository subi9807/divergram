export function optionalCoordinate(input: string, limit: 90 | 180): number | null {
  const text = input.trim();
  if (!text || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}
