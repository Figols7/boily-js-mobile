export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  provider: 'local' | 'google';
  isActive: boolean;
  isEmailVerified: boolean;
  avatar?: string;
  lastLoginAt?: Date;

  // Startup-specific fields
  companyName?: string;
  jobTitle?: string;
  industry?: string;
  teamSize?: string;
  interests?: string[];
  isOnboardingCompleted: boolean;
  trialStartedAt?: Date;

  // Relationships
  onboarding?: UserOnboarding;
  subscription?: Subscription;

  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UserActivity {
  id: string;
  activityType: 'register' | 'login_success' | 'login_failed' | 'google_login' | 'refresh_token' | 'logout';
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  failureReason?: string;
  createdAt: Date;
}

// Subscription Types
export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  PAUSED = 'paused',
}

export enum PlanType {
  STARTER = 'starter',
  GROWTH = 'growth',
  SCALE = 'scale',
  ENTERPRISE = 'enterprise',
}

export interface Subscription {
  id: string;
  userId: string;
  planType: PlanType;
  status: SubscriptionStatus;
  monthlyPrice: number;
  yearlyPrice: number;
  isYearly: boolean;
  trialEndsAt?: Date;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  monthlyApiLimit: number;
  currentApiUsage: number;
  teamMemberLimit: number;
  features: Record<string, boolean>;
  createdAt: Date;
  updatedAt: Date;
}

// Onboarding Types
export enum OnboardingStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

export interface UserOnboarding {
  id: string;
  userId: string;
  status: OnboardingStatus;
  currentStep: number;
  totalSteps: number;
  completedSteps: Record<string, boolean>;
  profileData: {
    companyName?: string;
    industry?: string;
    teamSize?: string;
    useCase?: string;
    goals?: string[];
    preferredFeatures?: string[];
  };
  preferences: {
    emailNotifications?: boolean;
    productUpdates?: boolean;
    marketingEmails?: boolean;
    weeklyReports?: boolean;
  };
  startedAt?: Date;
  completedAt?: Date;
  completionTimeMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics Types
export enum EventType {
  PAGE_VIEW = 'page_view',
  BUTTON_CLICK = 'button_click',
  FORM_SUBMIT = 'form_submit',
  API_CALL = 'api_call',
  FEATURE_USAGE = 'feature_usage',
  ONBOARDING_STEP = 'onboarding_step',
  SUBSCRIPTION_EVENT = 'subscription_event',
  CUSTOM_EVENT = 'custom_event',
}

export interface AnalyticsEvent {
  id: string;
  userId?: string;
  eventType: EventType;
  eventName: string;
  properties?: Record<string, any>;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  createdAt: Date;
}

export interface UserMetric {
  id: string;
  userId: string;
  metricDate: Date;
  apiCalls: number;
  pageViews: number;
  sessionDuration: number;
  featuresUsed: number;
  revenue: number;
  createdAt: Date;
}

// Dashboard Analytics
export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  revenue: number;
  apiCalls: number;
  conversionRate: number;
  churnRate: number;
  avgSessionDuration: number;
  topFeatures: { name: string; usage: number }[];
  userGrowth: { date: string; users: number }[];
  revenueGrowth: { date: string; revenue: number }[];
}