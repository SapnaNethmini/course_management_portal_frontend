import { signOut } from "firebase/auth";
import { auth } from "@/infrastructure/firebase/auth";
import { tokenService } from "@/infrastructure/firebase/tokenService";

const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX ?? "/api/v1";
const LOCALE_STORAGE_KEY = "edupath.locale";
const SUPPORTED_LOCALES = new Set(["en", "si", "ta"]);

export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, string[]>;
  requestId?: string;
}

export class ApiRequestError extends Error implements ApiError {
  code: string;
  status: number;
  details?: Record<string, string[]>;
  requestId?: string;

  constructor(err: ApiError) {
    super(err.message);
    this.code = err.code;
    this.status = err.status;
    this.details = err.details;
    this.requestId = err.requestId;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
  /** Sent as `X-Idempotency-Key` — required for cell-report submits, optional elsewhere. */
  idempotencyKey?: string;
};

/** Read the current locale from localStorage so the header survives SSR boundaries. */
function currentLocale(): string {
  if (typeof window === "undefined") return "en";
  try {
    const v = localStorage.getItem(LOCALE_STORAGE_KEY);
    return v && SUPPORTED_LOCALES.has(v) ? v : "en";
  } catch {
    return "en";
  }
}

function isProtectedPath(path: string): boolean {
  return (
    path.startsWith("/dashboard") ||
    path.startsWith("/my-courses") ||
    path.startsWith("/browse-courses") ||
    path.startsWith("/profile") ||
    path.startsWith("/notifications") ||
    path.startsWith("/home") ||
    path.startsWith("/my-cells") ||
    path.startsWith("/my-requests") ||
    path.startsWith("/cells") ||
    path.startsWith("/leader") ||
    path.startsWith("/g12") ||
    path.startsWith("/admin") ||
    path.startsWith("/super-admin") ||
    path.startsWith("/apply")
  );
}

/**
 * Base API request helper.
 *
 * - Prepends API prefix (`NEXT_PUBLIC_API_PREFIX`, default `/api/v1`).
 * - Attaches `Authorization: Bearer <id-token>` (V2: pulled via tokenService).
 * - Attaches `Accept-Language` from the active locale so backend can render
 *   notifications and emails in the user's preferred language (FR-A-009).
 * - Optional `X-Idempotency-Key` — used by cell-report submission to make
 *   offline retries safe (FR-CR-015 / NFR-AVA-004).
 * - On 401 with a token attached, refreshes once and retries; second 401 →
 *   signs out and (if on a protected path) sends user to /login.
 * - Returns `undefined` on 204; throws `ApiRequestError` on non-2xx.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, auth: useAuth = true, headers, idempotencyKey, ...rest } = options;
  return executeRequest<T>(path, { body, useAuth, headers, idempotencyKey, rest }, false);
}

interface ExecuteOptions {
  body: unknown;
  useAuth: boolean;
  headers: HeadersInit | undefined;
  idempotencyKey: string | undefined;
  rest: Omit<RequestInit, "body" | "headers">;
}

async function executeRequest<T>(
  path: string,
  opts: ExecuteOptions,
  isRetry: boolean,
): Promise<T> {
  const { body, useAuth, headers, idempotencyKey, rest } = opts;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept-Language": currentLocale(),
    ...(headers as Record<string, string> | undefined),
  };

  if (useAuth) {
    const token = isRetry ? await tokenService.refresh() : await tokenService.get();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  if (idempotencyKey) {
    finalHeaders["X-Idempotency-Key"] = idempotencyKey;
  }

  const res = await fetch(`${API_PREFIX}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const json = (await res.json().catch(() => ({}))) as
    | { error?: { code?: string; message?: string; details?: Record<string, string[]> }; requestId?: string }
    | T;

  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string; details?: Record<string, string[]> }; requestId?: string }).error;

    // 401: token may have just expired between cache hits — try once with a
    // forced refresh before giving up. Second failure means the session is
    // genuinely revoked (suspended account, server-side logout, etc.).
    if (res.status === 401 && useAuth && !isRetry) {
      return executeRequest<T>(path, opts, true);
    }

    if (res.status === 401) {
      signOut(auth).catch(() => null);
      tokenService.clear();
      if (typeof window !== "undefined" && isProtectedPath(window.location.pathname)) {
        window.location.href = "/login?reason=expired";
      }
    }

    throw new ApiRequestError({
      code: err?.code ?? "UNKNOWN_ERROR",
      message: err?.message ?? `Request failed with status ${res.status}`,
      status: res.status,
      details: err?.details,
      requestId: (json as { requestId?: string }).requestId,
    });
  }

  return json as T;
}
