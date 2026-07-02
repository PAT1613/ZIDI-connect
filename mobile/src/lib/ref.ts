/**
 * DRF serializers sometimes return foreign keys as nested objects
 * (e.g. `customer: { id, ... }`) and sometimes as bare ids. This unwraps either.
 */
export function idOf(
  value: unknown,
): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'object' && 'id' in (value as Record<string, unknown>)) {
    const id = (value as Record<string, unknown>).id;
    if (typeof id === 'string' || typeof id === 'number') return id;
  }
  return null;
}
