import { useCallback, useEffect, useState } from "react";

export function useApi<T>(loader: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (throwOnError = false) => {
    setLoading(true);
    setError("");
    try {
      setData(await loader());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load data.";
      setError(message);
      if (throwOnError) throw new Error(message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: () => load(), refresh: () => load(true), setData };
}
