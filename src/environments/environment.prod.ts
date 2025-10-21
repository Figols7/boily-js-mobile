/**
 * Production Environment Configuration
 *
 * This file contains environment-specific configuration for production.
 * Use environment variables for sensitive data in CI/CD.
 */

export const environment = {
  production: true,
  apiUrl: 'https://api.yourdomain.com/api', // Replace with actual production API
  appUrl: 'https://yourdomain.com',

  // Feature flags
  features: {
    enableAnalytics: true,
    enableDebugMode: false,
    enableServiceWorker: true,
  },

  // External services - USE ENVIRONMENT VARIABLES IN REAL DEPLOYMENT
  stripe: {
    publishableKey: 'pk_live_your_stripe_key_here', // Replace with actual live key
  },

  google: {
    oAuthClientId: 'your_google_client_id_here', // Replace with actual client ID
  },

  apple: {
    clientId: 'com.boilyjs.app',
    redirectURI: 'https://yourdomain.com/auth/apple/callback',
  },

  // API Configuration
  api: {
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 2000,
  },

  // Logging
  logging: {
    level: 'error',
    enableConsole: false,
    enableRemote: true, // Send to remote logging service (e.g., Sentry)
  },
} as const;
