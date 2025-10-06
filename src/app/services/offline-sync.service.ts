import { Injectable, signal } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Network } from '@capacitor/network';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { switchMap, map, catchError, tap } from 'rxjs/operators';

export interface PendingAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  data: any;
  timestamp: number;
  retries: number;
}

export interface CachedData {
  key: string;
  data: any;
  timestamp: number;
  expiresIn?: number; // milliseconds
}

@Injectable({
  providedIn: 'root'
})
export class OfflineSyncService {
  private readonly API_URL = 'http://localhost:3000/api';
  private readonly PENDING_ACTIONS_KEY = 'pending_actions';
  private readonly CACHE_PREFIX = 'cache_';
  private _storage: Storage | null = null;

  // Signal for online/offline status
  private isOnlineSignal = signal<boolean>(true);
  public isOnline = this.isOnlineSignal.asReadonly();

  // Signal for sync status
  private isSyncingSignal = signal<boolean>(false);
  public isSyncing = this.isSyncingSignal.asReadonly();

  // Signal for pending actions count
  private pendingActionsCountSignal = signal<number>(0);
  public pendingActionsCount = this.pendingActionsCountSignal.asReadonly();

  constructor(
    private storage: Storage,
    private http: HttpClient
  ) {
    this.init();
  }

  async init() {
    // Initialize storage
    const storage = await this.storage.create();
    this._storage = storage;

    // Initialize network listeners
    await this.initializeNetworkListeners();

    // Load pending actions count
    await this.updatePendingActionsCount();

    // Try to sync on startup if online
    if (this.isOnlineSignal()) {
      await this.syncPendingActions();
    }
  }

  private async initializeNetworkListeners() {
    // Get initial network status
    const status = await Network.getStatus();
    this.isOnlineSignal.set(status.connected);

    // Listen for network status changes
    Network.addListener('networkStatusChange', (status) => {
      const wasOffline = !this.isOnlineSignal();
      this.isOnlineSignal.set(status.connected);

      console.log('Network status changed:', status.connected ? 'online' : 'offline');

      // If we just came back online, sync pending actions
      if (wasOffline && status.connected) {
        console.log('Back online, syncing pending actions...');
        this.syncPendingActions();
      }
    });
  }

  // Cache data locally
  async cacheData(key: string, data: any, expiresIn?: number): Promise<void> {
    if (!this._storage) return;

    const cachedData: CachedData = {
      key,
      data,
      timestamp: Date.now(),
      expiresIn
    };

    await this._storage.set(`${this.CACHE_PREFIX}${key}`, cachedData);
  }

  // Get cached data
  async getCachedData(key: string): Promise<any | null> {
    if (!this._storage) return null;

    const cachedData: CachedData | null = await this._storage.get(`${this.CACHE_PREFIX}${key}`);

    if (!cachedData) return null;

    // Check if cache has expired
    if (cachedData.expiresIn) {
      const age = Date.now() - cachedData.timestamp;
      if (age > cachedData.expiresIn) {
        // Cache expired, remove it
        await this._storage.remove(`${this.CACHE_PREFIX}${key}`);
        return null;
      }
    }

    return cachedData.data;
  }

  // Clear specific cache
  async clearCache(key: string): Promise<void> {
    if (!this._storage) return;
    await this._storage.remove(`${this.CACHE_PREFIX}${key}`);
  }

  // Clear all cache
  async clearAllCache(): Promise<void> {
    if (!this._storage) return;

    const keys = await this._storage.keys();
    const cacheKeys = keys.filter(k => k.startsWith(this.CACHE_PREFIX));

    for (const key of cacheKeys) {
      await this._storage.remove(key);
    }
  }

  // Queue an action for later sync (when offline)
  async queueAction(type: PendingAction['type'], endpoint: string, data: any): Promise<void> {
    if (!this._storage) return;

    const action: PendingAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      endpoint,
      data,
      timestamp: Date.now(),
      retries: 0
    };

    const pendingActions = await this.getPendingActions();
    pendingActions.push(action);
    await this._storage.set(this.PENDING_ACTIONS_KEY, pendingActions);
    await this.updatePendingActionsCount();

    console.log('Action queued:', action);
  }

  // Get all pending actions
  private async getPendingActions(): Promise<PendingAction[]> {
    if (!this._storage) return [];
    const actions = await this._storage.get(this.PENDING_ACTIONS_KEY);
    return actions || [];
  }

  // Sync all pending actions
  async syncPendingActions(): Promise<void> {
    if (!this.isOnlineSignal() || this.isSyncingSignal()) {
      console.log('Cannot sync: offline or already syncing');
      return;
    }

    this.isSyncingSignal.set(true);

    try {
      const pendingActions = await this.getPendingActions();

      if (pendingActions.length === 0) {
        console.log('No pending actions to sync');
        this.isSyncingSignal.set(false);
        return;
      }

      console.log(`Syncing ${pendingActions.length} pending actions...`);

      const successfulActions: string[] = [];
      const failedActions: PendingAction[] = [];

      for (const action of pendingActions) {
        try {
          await this.executePendingAction(action);
          successfulActions.push(action.id);
          console.log(`Action ${action.id} synced successfully`);
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          action.retries++;

          // Retry up to 3 times
          if (action.retries < 3) {
            failedActions.push(action);
          } else {
            console.error(`Action ${action.id} exceeded retry limit, discarding`);
          }
        }
      }

      // Update pending actions (remove successful, keep failed)
      await this._storage?.set(this.PENDING_ACTIONS_KEY, failedActions);
      await this.updatePendingActionsCount();

      console.log(`Sync complete: ${successfulActions.length} successful, ${failedActions.length} failed`);
    } finally {
      this.isSyncingSignal.set(false);
    }
  }

  private async executePendingAction(action: PendingAction): Promise<void> {
    const url = `${this.API_URL}${action.endpoint}`;

    let request: Observable<any>;

    switch (action.type) {
      case 'CREATE':
        request = this.http.post(url, action.data);
        break;
      case 'UPDATE':
        request = this.http.put(url, action.data);
        break;
      case 'DELETE':
        request = this.http.delete(url);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }

    return request.toPromise();
  }

  private async updatePendingActionsCount(): Promise<void> {
    const actions = await this.getPendingActions();
    this.pendingActionsCountSignal.set(actions.length);
  }

  // Smart fetch: try cache first, then network, fallback to cache if offline
  smartFetch<T>(
    key: string,
    fetchFn: () => Observable<T>,
    cacheExpiry?: number
  ): Observable<T> {
    return from(this.getCachedData(key)).pipe(
      switchMap(cachedData => {
        if (this.isOnlineSignal()) {
          // Online: fetch from network and update cache
          return fetchFn().pipe(
            tap(data => {
              this.cacheData(key, data, cacheExpiry);
            }),
            catchError(error => {
              console.error('Network request failed, using cache:', error);
              // Network failed but we have cache
              if (cachedData) {
                return of(cachedData);
              }
              throw error;
            })
          );
        } else {
          // Offline: use cache or fail
          if (cachedData) {
            console.log('Using cached data (offline)');
            return of(cachedData);
          } else {
            throw new Error('No cached data available and device is offline');
          }
        }
      })
    );
  }

  // Check if a specific cache key exists and is valid
  async hasFreshCache(key: string): Promise<boolean> {
    const data = await this.getCachedData(key);
    return data !== null;
  }

  // Get cache age in milliseconds
  async getCacheAge(key: string): Promise<number | null> {
    if (!this._storage) return null;

    const cachedData: CachedData | null = await this._storage.get(`${this.CACHE_PREFIX}${key}`);
    if (!cachedData) return null;

    return Date.now() - cachedData.timestamp;
  }

  // Manual sync trigger
  async forceSyncforceSyncNow(): Promise<void> {
    if (!this.isOnlineSignal()) {
      throw new Error('Cannot sync while offline');
    }

    await this.syncPendingActions();
  }

  // Clear all pending actions (use with caution)
  async clearPendingActions(): Promise<void> {
    if (!this._storage) return;
    await this._storage.remove(this.PENDING_ACTIONS_KEY);
    await this.updatePendingActionsCount();
  }
}
