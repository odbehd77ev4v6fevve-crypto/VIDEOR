const TOKEN_KEY = 'vidora_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;
  isHtmlResponse?: boolean;

  constructor(message: string, status: number, code?: string, isHtmlResponse?: boolean) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.isHtmlResponse = isHtmlResponse;
  }
}

// Get configured API base URL if any, or default to current host
function getApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_BACKEND_URL;
  if (typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '');
  }
  return '';
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retries = 2
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json, text/plain, */*');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}${normalizedEndpoint}` : normalizedEndpoint;

  const method = (options.method || 'GET').toUpperCase();
  const isIdempotent = method === 'GET' || method === 'HEAD';

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: getApiBaseUrl() ? 'include' : 'same-origin',
    });
  } catch (netErr: any) {
    if (isIdempotent && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return apiRequest<T>(endpoint, options, retries - 1);
    }
    throw new ApiError(
      netErr?.message || 'Network request failed. Please check your internet connection.',
      0,
      'NETWORK_ERROR'
    );
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const isJson = contentType.includes('application/json');
  const isHtml = contentType.includes('text/html');

  // For idempotent GET requests, retry transient 502/503/504 gateway warmup
  if (isIdempotent && (response.status === 502 || response.status === 503 || response.status === 504) && retries > 0) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return apiRequest<T>(endpoint, options, retries - 1);
  }

  let data: any = null;
  let rawText = '';

  if (isJson) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      rawText = await response.text();
    } catch {
      rawText = '';
    }
  }

  // Handle failure HTTP statuses
  if (!response.ok) {
    let errorMsg = data?.error || data?.message;

    if (!errorMsg) {
      if (isHtml) {
        if (response.status === 404) {
          errorMsg = `API route '${normalizedEndpoint}' was not found on the server (HTTP 404).`;
        } else if (response.status === 502 || response.status === 503 || response.status === 504) {
          errorMsg = `Backend server is warming up or temporarily unreachable (HTTP ${response.status}). Please retry.`;
        } else {
          errorMsg = `Server returned an HTML error page (HTTP ${response.status}) instead of API data.`;
        }
      } else if (rawText && rawText.length < 120 && !rawText.includes('<')) {
        errorMsg = rawText.trim();
      } else {
        switch (response.status) {
          case 400:
            errorMsg = 'Bad request: Please verify the submitted information.';
            break;
          case 401:
            errorMsg = 'Invalid email or password.';
            break;
          case 403:
            errorMsg = 'Access denied: You do not have permission to perform this action.';
            break;
          case 404:
            errorMsg = 'Requested API resource was not found.';
            break;
          case 409:
            errorMsg = 'An account with this email already exists.';
            break;
          case 422:
            errorMsg = 'Unprocessable entity: Please check the required fields.';
            break;
          default:
            errorMsg = `Server error (HTTP ${response.status}). Please try again later.`;
        }
      }
    }

    throw new ApiError(errorMsg, response.status, data?.code, isHtml);
  }

  // Handle HTTP 200/201/204 where response is unexpectedly HTML or non-JSON
  if (isHtml) {
    throw new ApiError(
      `Unexpected response from ${normalizedEndpoint}: received HTML page instead of API JSON data. Ensure the Express backend is active and handling this route.`,
      response.status,
      'UNEXPECTED_HTML',
      true
    );
  }

  if (data === null && response.status !== 204) {
    throw new ApiError(
      `Invalid response from ${normalizedEndpoint}: expected JSON object but received non-JSON payload.`,
      response.status,
      'INVALID_PAYLOAD'
    );
  }

  return data as T;
}

export const api = {
  get: <T = any>(url: string) => apiRequest<T>(url, { method: 'GET' }),
  post: <T = any>(url: string, body?: any) =>
    apiRequest<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T = any>(url: string, body?: any) =>
    apiRequest<T>(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T = any>(url: string) => apiRequest<T>(url, { method: 'DELETE' }),
};