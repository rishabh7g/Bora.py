// The browser's own words for a failure, e.g. `DOMException: blocked` or
// `TypeError: Failed to fetch` — the detail line on a raised Notice, so the
// learner can hand something concrete to a search box (UI baseline §10).
//
// Duck-typed rather than `instanceof Error`: this app stores progress in
// IndexedDB via idb-keyval, and what IndexedDB rejects with is a
// DOMException, which does not inherit from Error in every engine. An
// `instanceof Error` check would silently drop exactly the failure this app
// is most likely to see.
export function describeError(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const { name, message } = error as { name?: unknown; message?: unknown };
  if (typeof name !== 'string' || name === '') return null;
  return typeof message === 'string' && message !== '' ? `${name}: ${message}` : name;
}
