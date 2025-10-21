/**
 * Application Configuration Injection Token
 *
 * This provides type-safe access to environment configuration throughout the app.
 * Use inject(APP_CONFIG) to access configuration in any component or service.
 *
 * The actual environment is provided in app.config.ts and will be replaced
 * via fileReplacements in angular.json for production builds.
 */

import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';

export type Environment = typeof environment;

export const APP_CONFIG = new InjectionToken<Environment>('app.config');
