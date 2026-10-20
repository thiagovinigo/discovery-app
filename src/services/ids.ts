/** Id único com prefixo legível. `Date.now()` sozinho repete quando dois itens nascem no mesmo milissegundo. */
export function newId(prefix: string): string {
  const unique = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${unique}`;
}
