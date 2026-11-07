import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';

// Read base URL from Vite environment variable with safe fallback
const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000/api';

/**
 * Centralized Axios client for FixBack AI API communication.
 * - JSON headers configured
 * - Standard 30-second timeout for LLM and memory operations
 * - Centralized request/response interceptors
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor for logging/tracing in development
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Prevent trailing slash issues with FastAPI routes
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Forward the error for caller handling
    return Promise.reject(error);
  }
);

/**
 * Extracts a user-friendly error message from any backend API error response.
 * Handles FastAPI validation errors (arrays of loc/msg), custom FixBack exceptions,
 * network connectivity issues, and HTTP status codes.
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; detail?: unknown; success?: boolean }
      | undefined;

    if (data) {
      // 1. Check if backend returned structured detail from FastAPI validation
      if (Array.isArray(data.detail) && data.detail.length > 0) {
        const validationDetails = data.detail
          .map((item: any) => {
            const loc = Array.isArray(item.loc) ? item.loc.filter((part: any) => part !== 'body').join('.') : '';
            const msg = item.msg ?? String(item);
            return loc ? `${loc}: ${msg}` : msg;
          })
          .join(', ');

        return data.message ? `${data.message} (${validationDetails})` : validationDetails;
      }

      // 2. Detail as a string message
      if (typeof data.detail === 'string' && data.detail.trim()) {
        return data.detail;
      }

      // 3. Custom FixBack error message
      if (typeof data.message === 'string' && data.message.trim()) {
        return data.message;
      }
    }

    // Network / timeout specific errors
    if (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
      return 'The request timed out. The server or AI service took too long to respond. Please try again.';
    }

    if (error.code === 'ERR_NETWORK' || !error.response) {
      return 'Unable to connect to the FixBack backend. Please verify that the backend is running on http://localhost:8000.';
    }

    if (error.response?.status === 404) {
      return 'The requested resource was not found on the server.';
    }

    if (error.response?.status === 422) {
      return 'Invalid request payload submitted. Please review your input fields.';
    }

    if (error.response?.status === 500) {
      return 'The backend encountered an internal server error. Check backend console logs for details.';
    }

    if (error.response?.status === 502) {
      return 'External service gateway error (Hindsight or Groq unreachable).';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

