import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { map, tap, switchMap } from 'rxjs/operators';
import { Storage } from '@ionic/storage-angular';
import { APP_CONFIG } from '../config/app.config.token';
import { Subscription, PlanType, SubscriptionStatus } from '../models/user.model';

interface SubscriptionPlan {
  type: PlanType;
  name: string;
  monthly: { price: number; priceId: string | null };
  yearly: { price: number; priceId: string | null };
  features: {
    apiLimit: number;
    teamMembers: number;
    analytics: boolean;
    support: string;
    customDomain: boolean;
    advancedFeatures: boolean;
  };
}

interface UsageStats {
  apiCalls: {
    used: number;
    limit: number;
    percentage: number;
    unlimited: boolean;
  };
  teamMembers: {
    used: number;
    limit: number;
    unlimited: boolean;
  };
  billingPeriod: {
    start: Date | null;
    end: Date | null;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private config = inject(APP_CONFIG);
  private http = inject(HttpClient);
  private storage = inject(Storage);

  private readonly API_URL = this.config.apiUrl;
  private readonly SUBSCRIPTION_KEY = 'subscription';
  private _storage: Storage | null = null;

  // Signals for reactive state management
  private subscriptionSignal = signal<Subscription | null>(null);

  // Public readonly signals
  public subscription = this.subscriptionSignal.asReadonly();

  // Computed signals for subscription state
  public isActive = computed(() => {
    const sub = this.subscriptionSignal();
    return sub?.status === SubscriptionStatus.ACTIVE;
  });

  public isTrial = computed(() => {
    const sub = this.subscriptionSignal();
    return sub?.status === SubscriptionStatus.TRIAL;
  });

  public isPastDue = computed(() => {
    const sub = this.subscriptionSignal();
    return sub?.status === SubscriptionStatus.PAST_DUE;
  });

  public currentPlan = computed(() => {
    return this.subscriptionSignal()?.planType || PlanType.STARTER;
  });

  public apiUsagePercentage = computed(() => {
    const sub = this.subscriptionSignal();
    if (!sub || sub.monthlyApiLimit === 0) return 0;
    if (sub.monthlyApiLimit === -1) return 0; // Unlimited
    return (sub.currentApiUsage / sub.monthlyApiLimit) * 100;
  });

  public isApproachingLimit = computed(() => {
    return this.apiUsagePercentage() >= 80;
  });

  public isApiLimitReached = computed(() => {
    const sub = this.subscriptionSignal();
    if (!sub || sub.monthlyApiLimit === -1) return false; // Unlimited
    return sub.currentApiUsage >= sub.monthlyApiLimit;
  });

  constructor() {
    this.init();
  }

  async init() {
    const storage = await this.storage.create();
    this._storage = storage;
    await this.loadStoredSubscription();
  }

  // Get current subscription from server
  getCurrentSubscription(): Observable<Subscription> {
    return this.http.get<Subscription>(`${this.API_URL}/subscriptions/current`)
      .pipe(
        switchMap(sub => from(this.setStoredSubscription(sub)).pipe(map(() => sub))),
        tap(sub => this.subscriptionSignal.set(sub))
      );
  }

  // Get all available plans
  getAvailablePlans(): Observable<SubscriptionPlan[]> {
    return this.http.get<SubscriptionPlan[]>(`${this.API_URL}/subscriptions/plans`);
  }

  // Create checkout session (for web-based Stripe flow)
  createCheckoutSession(planType: PlanType, isYearly: boolean = false): Observable<{ checkoutUrl: string }> {
    return this.http.post<{ checkoutUrl: string }>(`${this.API_URL}/subscriptions/checkout`, {
      planType,
      isYearly,
      successUrl: `${window.location.origin}/dashboard`,
      cancelUrl: `${window.location.origin}/pricing`
    });
  }

  // Change subscription plan
  changePlan(newPlanType: PlanType, isYearly: boolean = false): Observable<Subscription> {
    return this.http.post<Subscription>(`${this.API_URL}/subscriptions/change-plan`, {
      planType: newPlanType,
      isYearly
    }).pipe(
      switchMap(sub => from(this.setStoredSubscription(sub)).pipe(map(() => sub))),
      tap(sub => this.subscriptionSignal.set(sub))
    );
  }

  // Cancel subscription
  cancelSubscription(immediate: boolean = false): Observable<Subscription> {
    return this.http.post<Subscription>(`${this.API_URL}/subscriptions/cancel`, {
      immediate
    }).pipe(
      switchMap(sub => from(this.setStoredSubscription(sub)).pipe(map(() => sub))),
      tap(sub => this.subscriptionSignal.set(sub))
    );
  }

  // Resume subscription
  resumeSubscription(): Observable<Subscription> {
    return this.http.post<Subscription>(`${this.API_URL}/subscriptions/resume`, {})
      .pipe(
        switchMap(sub => from(this.setStoredSubscription(sub)).pipe(map(() => sub))),
        tap(sub => this.subscriptionSignal.set(sub))
      );
  }

  // Get billing portal URL
  getBillingPortalUrl(): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.API_URL}/subscriptions/billing-portal`, {
      returnUrl: `${window.location.origin}/dashboard`
    });
  }

  // Get usage statistics
  getUsageStats(): Observable<UsageStats> {
    return this.http.get<UsageStats>(`${this.API_URL}/subscriptions/usage`);
  }

  // Get billing history
  getBillingHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/subscriptions/billing-history`);
  }

  // Preview subscription change (prorated amount)
  previewSubscriptionChange(newPlanType: PlanType, isYearly: boolean): Observable<any> {
    return this.http.post(`${this.API_URL}/subscriptions/preview-change`, {
      planType: newPlanType,
      isYearly
    });
  }

  // Storage methods
  private async loadStoredSubscription(): Promise<void> {
    if (!this._storage) return;
    const sub = await this._storage.get(this.SUBSCRIPTION_KEY);
    if (sub) {
      this.subscriptionSignal.set(sub);
    }
  }

  private async setStoredSubscription(subscription: Subscription): Promise<void> {
    if (!this._storage) return;
    await this._storage.set(this.SUBSCRIPTION_KEY, subscription);
  }

  async clearStoredSubscription(): Promise<void> {
    if (!this._storage) return;
    await this._storage.remove(this.SUBSCRIPTION_KEY);
    this.subscriptionSignal.set(null);
  }

  // Utility methods (accepting external subscriptions for flexibility)
  isPlanUpgrade(currentPlan: PlanType, newPlan: PlanType): boolean {
    const planHierarchy = {
      [PlanType.STARTER]: 0,
      [PlanType.GROWTH]: 1,
      [PlanType.SCALE]: 2,
      [PlanType.ENTERPRISE]: 3
    };
    return planHierarchy[newPlan] > planHierarchy[currentPlan];
  }

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  }

  getDaysRemainingInTrial(subscription: Subscription): number {
    if (!subscription.trialEndsAt) return 0;
    const now = new Date();
    const trialEnd = new Date(subscription.trialEndsAt);
    const diff = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  getDaysRemainingInBillingPeriod(subscription: Subscription): number {
    if (!subscription.currentPeriodEnd) return 0;
    const now = new Date();
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const diff = periodEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  canAccessFeature(featureName: string): boolean {
    const sub = this.subscriptionSignal();
    if (!sub) return false;
    return sub.features?.[featureName] || false;
  }

  hasApiCallsRemaining(): boolean {
    const sub = this.subscriptionSignal();
    if (!sub) return false;
    if (sub.monthlyApiLimit === -1) return true; // Unlimited
    return sub.currentApiUsage < sub.monthlyApiLimit;
  }
}
