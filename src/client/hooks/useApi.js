import { useCallback } from 'react';

/**
 * Simple hook for JSON API calls with credentials + error handling.
 */
export default function useApi() {
  const fetchJSON = useCallback(async (url, opts = {}) => {
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    const data = await res.json();
    if (!res.ok) {
      const msg =
        data.msg ||
        (data.errors && data.errors.map((e) => e.msg).join(', ')) ||
        `${res.status} ${res.statusText}`;
      throw new Error(msg);
    }
    return data;
  }, []);
  return { fetchJSON };
}
