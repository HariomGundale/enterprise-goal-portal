export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const doFetch = () =>
    fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

  let res = await doFetch();

  if (
    res.status === 401 &&
    !url.startsWith("/api/auth/login") &&
    !url.startsWith("/api/auth/refresh")
  ) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      res = await doFetch();
    }
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiClientError(
      data.error ?? "UNKNOWN",
      data.message ?? "Request failed",
      res.status,
      data.details,
    );
  }

  return data as T;
}
