"use client";

export function emit<T = any>(name: string, detail?: T) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function subscribe<T = any>(
  name: string,
  handler: (detail: T) => void
): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<T>).detail);
  window.addEventListener(name, listener as EventListener);
  return () => window.removeEventListener(name, listener as EventListener);
}
