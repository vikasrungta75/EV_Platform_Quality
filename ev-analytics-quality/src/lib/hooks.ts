'use client';
import { useCallback, useEffect, useState } from 'react';

// Reads a value from the page address once, when the screen opens. Used to open a screen on a given tab, VIN or issue.
export function urlParam(name: string): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(name) || '';
}
// Small per-browser store for demo decisions (approvals, acknowledgements). A real deployment would save these on the server.
export function useLocal<T>(key: string, init: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(init);
  useEffect(() => {
    try { const s = localStorage.getItem(key); if (s) setVal(JSON.parse(s)); } catch {}
  }, [key]);
  const set = useCallback((v: T) => { setVal(v); try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key]);
  return [val, set];
}
