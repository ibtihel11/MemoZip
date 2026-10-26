/**
 * Tiny change bus. Services call notify() after a successful mutation and every mounted
 * useQuery refetches, so lists and counts stay fresh without manual wiring in each page.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notify(): void {
  listeners.forEach((listener) => listener());
}
