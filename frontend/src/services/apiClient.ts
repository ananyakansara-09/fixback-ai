import { apiClient, getApiErrorMessage } from '@/api/axios';

// Re-export for seamless backward compatibility across the application
export { apiClient };
export const getErrorMessage = getApiErrorMessage;
