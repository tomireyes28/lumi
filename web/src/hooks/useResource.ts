import { useCallback, useEffect, useRef, useState } from "react";

type ResourceState<T> = {
  key: string;
  data?: T;
  loading: boolean;
  error: string | null;
};
export function useResource<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
) {
  const [state, setState] = useState<ResourceState<T>>({
    key,
    loading: true,
    error: null,
  });
  const request = useRef(0);
  const activeKey = useRef(key);
  const mounted = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const reload = useCallback(async (): Promise<boolean> => {
    if (!mounted.current || activeKey.current !== key) return false;
    const id = ++request.current;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState((previous) => ({
      key,
      data: previous.key === key ? previous.data : undefined,
      loading: true,
      error: null,
    }));
    try {
      const data = await load(current.signal);
      if (!mounted.current || id !== request.current || current.signal.aborted)
        return false;
      setState({ key, data, loading: false, error: null });
      return true;
    } catch (error) {
      if (!mounted.current || id !== request.current || current.signal.aborted)
        return false;
      setState((previous) => ({
        ...previous,
        key,
        loading: false,
        error:
          error instanceof Error
            ? error.name === "TimeoutError"
              ? "La consulta tardó demasiado. Reintentá la carga."
              : error.message
            : "No se pudieron cargar los datos.",
      }));
      return false;
    }
  }, [key, load]);
  useEffect(() => {
    mounted.current = true;
    activeKey.current = key;
    void reload();
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, [key, reload]);
  return {
    data: state.key === key ? state.data : undefined,
    loading: state.key !== key || state.loading,
    error: state.key === key ? state.error : null,
    reload,
  };
}
