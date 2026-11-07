import axios, { AxiosError } from 'axios';
import { mockAdapter } from '@/services/mock/mockAdapter';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';

// Set to false once the FixBack backend is running; requests then go over the network.
const USE_MOCK_API = true;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  adapter: USE_MOCK_API ? mockAdapter : undefined,
});

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
    if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  }
  return 'Something went wrong. Please try again.';
};
