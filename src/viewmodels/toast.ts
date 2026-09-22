import { createStore, useStore } from './store';

interface Toast {
  id: number;
  message: string;
}

const store = createStore<Toast | null>(null);
let timer: number | undefined;
let nextId = 1;

export function showToast(message: string, durationMs = 1800): void {
  window.clearTimeout(timer);
  store.set({ id: nextId++, message });
  timer = window.setTimeout(() => store.set(null), durationMs);
}

export function useToast(): Toast | null {
  return useStore(store);
}
