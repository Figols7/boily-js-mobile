/**
 * Auth HTTP Interceptor (Functional Style for Angular 20)
 *
 * Automatically adds JWT token to outgoing requests and handles token refresh.
 */

import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { throwError, BehaviorSubject } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Token refresh state (shared across all requests)
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

/**
 * Determines if token should be added to the request
 */
function shouldAddToken(url: string): boolean {
  // Don't add token to public auth endpoints
  const publicEndpoints = ['/auth/login', '/auth/register', '/auth/google', '/auth/apple'];
  return !publicEndpoints.some(endpoint => url.includes(endpoint));
}

/**
 * Adds Authorization header with Bearer token
 */
function addToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

/**
 * Main Auth Interceptor Function
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Get token synchronously - AuthService needs to expose a sync method
  const getTokenSync = () => {
    // For Ionic Storage, we need to handle this differently
    // This is a simplified version - in production you might want to cache the token
    try {
      return localStorage.getItem('accessToken');
    } catch {
      return null;
    }
  };

  const token = getTokenSync();

  // Clone request and add token if available
  let authReq = req;
  if (token && shouldAddToken(req.url)) {
    authReq = addToken(req, token);
  }

  // Handle request and catch 401 errors
  return next(authReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return handle401Error(authReq, next, authService);
      }
      return throwError(() => error);
    })
  );
};

/**
 * Handles 401 Unauthorized errors with token refresh logic
 */
function handle401Error(request: HttpRequest<unknown>, next: HttpHandlerFn, authService: AuthService) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((tokenResponse: any) => {
        isRefreshing = false;
        refreshTokenSubject.next(tokenResponse.accessToken);
        return next(addToken(request, tokenResponse.accessToken));
      }),
      catchError((err) => {
        isRefreshing = false;
        refreshTokenSubject.next(null);
        // Logout user on refresh failure
        authService.logout().subscribe();
        return throwError(() => err);
      })
    );
  }

  // Wait for token refresh to complete
  return refreshTokenSubject.pipe(
    filter((token) => token !== null),
    take(1),
    switchMap((token) => {
      return next(addToken(request, token!));
    })
  );
}
