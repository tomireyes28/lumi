import { parseHttpResponse, errorMessage } from "./contracts";
import { useAuthStore } from "@/store/useAuthStore";

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  const timeout =
    typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(10000)
      : undefined;
  const signal =
    options.signal && timeout
      ? AbortSignal.any([options.signal, timeout])
      : (options.signal ?? timeout);
  const response = await fetch(`/api/backend${path}`, {
    credentials: options.credentials ?? "include",
    ...options,
    signal,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      useAuthStore.getState().clear();
      window.location.replace("/");
    }
    throw new Error("Sesión expirada");
  }

  if (!response.ok) {
    const errorData: unknown = await response.json().catch(() => null);
    throw new Error(errorMessage(errorData));
  }

  // Acknowledged writes do not depend on a body the caller never consumes.
  // Treating an empty/changed body as a failed write could cause duplicate POSTs.
  if (
    response.status === 204 ||
    (options.method &&
      !["GET", "HEAD"].includes(options.method) &&
      !path.startsWith("/auth/"))
  )
    return null as T;

  const payload: unknown = await response.json();
  // T is a caller convenience; runtime validation above the UI is mandatory.
  return parseHttpResponse(path, options.method ?? "GET", payload) as T;
}
