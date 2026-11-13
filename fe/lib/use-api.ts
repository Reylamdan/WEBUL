"use client";

import { useEffect, useRef, useState } from "react";

interface Result<T> {
  key: string;
  data?: T;
  error?: unknown;
}

// Mengambil data saat `key` berubah. `key` harus mewakili seluruh parameter request.
// `data` tetap berisi hasil terakhir selama request berikutnya berjalan, agar daftar tidak berkedip.
export function useApi<T>(key: string, fetcher: () => Promise<T>) {
  const [result, setResult] = useState<Result<T> | null>(null);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let cancelled = false;
    fetcherRef.current().then(
      (data) => {
        if (!cancelled) setResult({ key, data });
      },
      (error: unknown) => {
        if (!cancelled) setResult({ key, error });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key]);

  const settled = result !== null && result.key === key;
  return {
    data: result?.data,
    error: settled ? result.error : undefined,
    loading: !settled,
  };
}

export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
