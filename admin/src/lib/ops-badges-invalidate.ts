/** Module-level registry so apiFetch can invalidate badges without importing React. */

type InvalidateFn = () => void;

let handler: InvalidateFn | null = null;

export function setOpsBadgesInvalidator(fn: InvalidateFn | null) {
  handler = fn;
}

export function invalidateOpsBadges() {
  handler?.();
}
