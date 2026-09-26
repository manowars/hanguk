import { useCallback, useState } from "preact/hooks";
import { toastError } from "./Toast";

/** Wraps an async function with loading/error state. Errors are shown as a toast and kept in `error`. */
export function useAsync<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<R | null>(null);
  const run = useCallback(
    async (...args: A): Promise<R | null> => {
      setLoading(true);
      setError(null);
      try {
        const r = await fn(...args);
        setData(r);
        return r;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        toastError(err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fn],
  );
  return { run, loading, error, data, setData };
}
