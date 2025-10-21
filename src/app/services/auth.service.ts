import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, from } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { Storage } from '@ionic/storage-angular';
import { Platform } from '@ionic/angular';
import { SignInWithApple, SignInWithAppleResponse, SignInWithAppleOptions } from '@capacitor-community/apple-sign-in';
import { APP_CONFIG } from '../config/app.config.token';
import {
  User,
  AuthResponse,
  TokenResponse,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  UserActivity
} from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private config = inject(APP_CONFIG);
  private http = inject(HttpClient);
  private router = inject(Router);
  private storage = inject(Storage);
  private platform = inject(Platform);

  private readonly API_URL = this.config.apiUrl;
  private readonly TOKEN_KEY = 'accessToken';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private readonly USER_KEY = 'user';
  private _storage: Storage | null = null;

  // Signals for reactive state management
  private currentUserSignal = signal<User | null>(null);
  private isAuthenticatedSignal = signal<boolean>(false);

  // Public computed signals
  public currentUser = this.currentUserSignal.asReadonly();
  public isAuthenticated = this.isAuthenticatedSignal.asReadonly();
  public userDisplayName = computed(() => {
    const user = this.currentUserSignal();
    return user ? user.fullName || `${user.firstName} ${user.lastName}`.trim() : '';
  });

  constructor() {
    this.init();
  }

  async init() {
    // Initialize storage
    const storage = await this.storage.create();
    this._storage = storage;
    await this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    const token = await this.getToken();
    const refreshToken = await this.getRefreshToken();
    const user = await this.getStoredUser();

    if (token && user) {
      // Sync tokens to localStorage for HTTP interceptor
      try {
        localStorage.setItem(this.TOKEN_KEY, token);
        if (refreshToken) {
          localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
        }
      } catch (e) {
        console.error('Failed to sync tokens to localStorage', e);
      }

      this.currentUserSignal.set(user);
      this.isAuthenticatedSignal.set(true);
    }
  }

  // Authentication Methods
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        switchMap(response => from(this.setAuthData(response)).pipe(map(() => response))),
        catchError(this.handleError)
      );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/register`, userData)
      .pipe(
        switchMap(response => from(this.setAuthData(response)).pipe(map(() => response))),
        catchError(this.handleError)
      );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/logout`, {})
      .pipe(
        switchMap(() => from(this.clearAuthData())),
        catchError(() => {
          // Even if logout fails on server, clear local data
          return from(this.clearAuthData());
        })
      );
  }

  refreshToken(): Observable<TokenResponse> {
    return from(this.getRefreshToken()).pipe(
      switchMap(refreshToken => {
        if (!refreshToken) {
          return throwError(() => new Error('No refresh token available'));
        }

        const refreshData: RefreshTokenRequest = { refreshToken };
        return this.http.post<TokenResponse>(`${this.API_URL}/auth/refresh`, refreshData)
          .pipe(
            switchMap(response =>
              from(this.setTokens(response.accessToken, response.refreshToken))
                .pipe(map(() => response))
            ),
            catchError(error => {
              return from(this.clearAuthData()).pipe(
                switchMap(() => throwError(() => error))
              );
            })
          );
      })
    );
  }

  // Google OAuth - Modified for mobile
  async loginWithGoogle(): Promise<void> {
    if (this.platform.is('capacitor')) {
      // TODO: Implement Google Sign-In with Capacitor plugin
      // This will require @codetrix-studio/capacitor-google-auth plugin
      console.log('Google login for mobile not yet implemented');
    } else {
      // Web fallback
      window.location.href = `${this.API_URL}/auth/google`;
    }
  }

  handleGoogleCallback(token: string, refreshToken: string): Observable<User> {
    return from(this.setTokens(token, refreshToken)).pipe(
      switchMap(() => this.getCurrentUser()),
      tap(user => {
        this.currentUserSignal.set(user);
        this.isAuthenticatedSignal.set(true);
      })
    );
  }

  // Apple Sign-In - Native iOS
  async loginWithApple(): Promise<void> {
    if (!this.platform.is('capacitor')) {
      // Web fallback - redirect to backend
      window.location.href = `${this.API_URL}/auth/apple`;
      return;
    }

    try {
      const options: SignInWithAppleOptions = {
        clientId: 'com.boilyjs.app', // Replace with your actual bundle ID
        redirectURI: 'https://your-domain.com/auth/apple/callback', // Replace with your domain
        scopes: 'email name',
        state: Math.random().toString(36).substring(2, 15),
        nonce: Math.random().toString(36).substring(2, 15)
      };

      const response: SignInWithAppleResponse = await SignInWithApple.authorize(options);

      // Send Apple credentials to backend for verification
      await this.handleAppleSignIn(response);
    } catch (error: any) {
      console.error('Apple Sign-In failed:', error);
      if (error.code === '1001') {
        // User cancelled
        throw new Error('Apple Sign-In was cancelled');
      }
      throw new Error('Apple Sign-In failed. Please try again.');
    }
  }

  private async handleAppleSignIn(response: SignInWithAppleResponse): Promise<void> {
    try {
      // Send Apple credentials to your backend for verification
      const authResponse = await this.http.post<AuthResponse>(
        `${this.API_URL}/auth/apple`,
        {
          identityToken: response.response.identityToken,
          authorizationCode: response.response.authorizationCode,
          user: response.response.user ? {
            email: response.response.email,
            givenName: response.response.givenName,
            familyName: response.response.familyName
          } : null
        }
      ).toPromise();

      if (authResponse) {
        await this.setAuthData(authResponse);
        await this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      console.error('Failed to authenticate with Apple:', error);
      throw new Error('Failed to authenticate with Apple. Please try again.');
    }
  }

  // User Data Methods
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/auth/me`)
      .pipe(
        switchMap(user =>
          from(this.setStoredUser(user)).pipe(map(() => user))
        ),
        tap(user => {
          this.currentUserSignal.set(user);
        }),
        catchError(this.handleError)
      );
  }

  getUserActivity(page: number = 1, limit: number = 20): Observable<{activities: UserActivity[], pagination: any}> {
    return this.http.get<{activities: UserActivity[], pagination: any}>(`${this.API_URL}/auth/activity?page=${page}&limit=${limit}`)
      .pipe(catchError(this.handleError));
  }

  getSuspiciousActivity(): Observable<{suspicious_activities: UserActivity[]}> {
    return this.http.get<{suspicious_activities: UserActivity[]}>(`${this.API_URL}/auth/security/suspicious`)
      .pipe(catchError(this.handleError));
  }

  // Token Management - Using Ionic Storage
  async getToken(): Promise<string | null> {
    if (!this._storage) return null;
    return await this._storage.get(this.TOKEN_KEY);
  }

  async getRefreshToken(): Promise<string | null> {
    if (!this._storage) return null;
    return await this._storage.get(this.REFRESH_TOKEN_KEY);
  }

  private async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    if (!this._storage) return;
    // Save to Ionic Storage for persistence
    await this._storage.set(this.TOKEN_KEY, accessToken);
    await this._storage.set(this.REFRESH_TOKEN_KEY, refreshToken);

    // Also save to localStorage for sync access in HTTP interceptor
    try {
      localStorage.setItem(this.TOKEN_KEY, accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    } catch (e) {
      console.error('Failed to save tokens to localStorage', e);
    }
  }

  private async setAuthData(authResponse: AuthResponse): Promise<void> {
    await this.setTokens(authResponse.accessToken, authResponse.refreshToken);
    await this.setStoredUser(authResponse.user);
    this.currentUserSignal.set(authResponse.user);
    this.isAuthenticatedSignal.set(true);
  }

  private async clearAuthData(): Promise<void> {
    if (this._storage) {
      await this._storage.remove(this.TOKEN_KEY);
      await this._storage.remove(this.REFRESH_TOKEN_KEY);
      await this._storage.remove(this.USER_KEY);
    }

    // Also clear from localStorage
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    } catch (e) {
      console.error('Failed to clear tokens from localStorage', e);
    }

    this.currentUserSignal.set(null);
    this.isAuthenticatedSignal.set(false);
    this.router.navigate(['/']);
  }

  private async getStoredUser(): Promise<User | null> {
    if (!this._storage) return null;
    return await this._storage.get(this.USER_KEY);
  }

  private async setStoredUser(user: User): Promise<void> {
    if (!this._storage) return;
    await this._storage.set(this.USER_KEY, user);
  }

  // Utility Methods
  isAuthenticatedValue(): boolean {
    return this.isAuthenticatedSignal();
  }

  getCurrentUserValue(): User | null {
    return this.currentUserSignal();
  }

  async isTokenExpired(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      switch (error.status) {
        case 401:
          errorMessage = 'Invalid credentials or session expired';
          break;
        case 403:
          errorMessage = 'Access denied';
          break;
        case 404:
          errorMessage = 'Service not found';
          break;
        case 429:
          errorMessage = 'Too many requests. Please try again later';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later';
          break;
        default:
          errorMessage = error.error?.message || `Error: ${error.status}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}