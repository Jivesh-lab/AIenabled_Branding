/**
 * Thin fetch wrapper for AAI–DBITIC API calls.
 *
 * - Always includes credentials (so the httpOnly aai_token cookie travels with requests)
 * - Sets JSON Content-Type by default
 * - Handles 401/403 by redirecting to /login (client-side)
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: Record<string, unknown> | string | FormData;
};

async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers, ...rest } = options;

  const isJson = body && typeof body === "object" && !(body instanceof FormData);

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    credentials: "include", // send httpOnly cookie with every request
    headers: {
      ...(isJson ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: isJson ? JSON.stringify(body) : (body as BodyInit | undefined),
  });

  // Handle auth errors — redirect to login
  if (response.status === 401 || response.status === 403) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Unauthorised");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  get: <T = unknown>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { method: "GET", ...options }),

  post: <T = unknown>(path: string, body: Record<string, unknown>, options?: RequestOptions) =>
    apiFetch<T>(path, { method: "POST", body, ...options }),

  put: <T = unknown>(path: string, body: Record<string, unknown>, options?: RequestOptions) =>
    apiFetch<T>(path, { method: "PUT", body, ...options }),

  del: <T = unknown>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { method: "DELETE", ...options }),
};

export default api;
