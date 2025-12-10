/**
 * Smart API configuration that works with localhost, LAN, and Cloudflare tunnel
 */

// Detect environment and set appropriate URLs
const getEnvironment = () => {
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'local';
  } else if (hostname.includes('192.168.') || hostname.includes('10.') || hostname.includes('172.')) {
    return 'lan';
  } else if (hostname.includes('quizdash.dpdns.org')) {
    return 'production';
  } else {
    return 'local'; // fallback
  }
};

const environment = getEnvironment();

// API Configuration based on environment
export const API_CONFIG = {
  local: {
    baseURL: 'http://localhost:8090/api', // Use Nginx proxy
    websocketURL: 'ws://localhost:3001',
    grafanaURL: 'http://localhost:3003',
    adminerURL: 'http://localhost:8080',
  },
  lan: {
    baseURL: `http://${window.location.hostname}:8090/api`, // Use Nginx proxy
    websocketURL: `ws://${window.location.hostname}:3001`,
    grafanaURL: `http://${window.location.hostname}:3003`,
    adminerURL: `http://${window.location.hostname}:8080`,
  },
  production: {
    baseURL: 'https://api.quizdash.dpdns.org/api',
    websocketURL: 'ws://localhost:3001', // FORCE LOCAL WEBSOCKET IN DEV
    grafanaURL: 'https://grafana.quizdash.dpdns.org',
    adminerURL: 'https://adminer.quizdash.dpdns.org',
  }
};

// Export current configuration
export const currentConfig = API_CONFIG[environment];

// Export individual URLs
export const API_BASE_URL = currentConfig.baseURL;
export const WEBSOCKET_URL = currentConfig.websocketURL;
export const GRAFANA_URL = currentConfig.grafanaURL;
export const ADMINER_URL = currentConfig.adminerURL;

// Debug information
console.log('🌐 Environment detected:', environment);
console.log('🔗 API Configuration:', currentConfig);

// Export environment for other components
export { environment };
