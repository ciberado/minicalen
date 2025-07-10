// API Configuration for client-side
interface ApiConfig {
  baseUrl: string;
  websocketUrl: string;
}

const getApiConfig = (): ApiConfig => {
  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV;
  
  // Get custom API URL from environment variables
  const customApiUrl = import.meta.env.VITE_API_URL;
  const customWsUrl = import.meta.env.VITE_WS_URL;
  
  // Default development URLs
  let baseUrl = 'http://localhost:3001';
  let websocketUrl = 'http://localhost:3001';
  
  if (customApiUrl) {
    baseUrl = customApiUrl;
    // If no custom WebSocket URL is provided, derive it from API URL
    websocketUrl = customWsUrl || customApiUrl;
  } else if (!isDevelopment) {
    // In production without custom URLs, try to derive from current location
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // Assume API is on the same host, different port or path
    baseUrl = `${protocol}//${host}`;
    websocketUrl = customWsUrl || `${wsProtocol}//${host}`;
  }
  
  return {
    baseUrl: baseUrl.replace(/\/$/, ''), // Remove trailing slash
    websocketUrl: websocketUrl.replace(/\/$/, '') // Remove trailing slash
  };
};

export const apiConfig = getApiConfig();

// Helper function to get full API endpoint
export const getApiUrl = (endpoint: string): string => {
  return `${apiConfig.baseUrl}/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
};

// Helper function to get WebSocket URL
export const getWebSocketUrl = (): string => {
  return apiConfig.websocketUrl;
};

// Export for debugging
export const debugApiConfig = () => {
  console.log('API Configuration:', {
    isDevelopment: import.meta.env.DEV,
    customApiUrl: import.meta.env.VITE_API_URL,
    customWsUrl: import.meta.env.VITE_WS_URL,
    baseUrl: apiConfig.baseUrl,
    websocketUrl: apiConfig.websocketUrl
  });
};
