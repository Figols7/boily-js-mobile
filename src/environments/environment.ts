/**
 * Development Environment Configuration
 *
 * This file contains environment-specific configuration for development.
 * Do NOT commit sensitive keys to version control.
 */

export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  appUrl: 'http://localhost:8100', // Ionic default port

  // Feature flags
  features: {
    enableAnalytics: true,
    enableDebugMode: true,
    enableServiceWorker: false,
  },

  // External services
  stripe: {
    publishableKey: 'pk_test_your_stripe_key_here', // Replace with actual test key
  },

  google: {
    oAuthClientId: 'your_google_client_id_here', // Replace with actual client ID
  },

  apple: {
    clientId: 'com.boilyjs.app',
    redirectURI: 'https://your-domain.com/auth/apple/callback',
  },

  // API Configuration
  api: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },

  // Logging
  logging: {
    level: 'debug',
    enableConsole: true,
    enableRemote: false,
  },
} as const;

export type Environment = typeof environment;
