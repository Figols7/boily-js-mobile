import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SubscriptionService } from '../../services/subscription.service';
import { User, SubscriptionStatus, PlanType } from '../../models/user.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class DashboardPage implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  public subscriptionService = inject(SubscriptionService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private loadingCtrl = inject(LoadingController);

  // Signals from services
  currentUser = this.authService.currentUser;
  subscription = this.subscriptionService.subscription;
  isActive = this.subscriptionService.isActive;
  isTrial = this.subscriptionService.isTrial;
  apiUsagePercentage = this.subscriptionService.apiUsagePercentage;
  isApproachingLimit = this.subscriptionService.isApproachingLimit;
  currentPlan = this.subscriptionService.currentPlan;

  // Component state
  usageStats: any = null;
  billingHistory: any[] = [];
  isLoading = false;
  private subscriptions: Subscription[] = [];

  // Enums for template
  SubscriptionStatus = SubscriptionStatus;
  PlanType = PlanType;

  async ngOnInit() {
    await this.loadDashboardData();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async loadDashboardData() {
    const loading = await this.loadingCtrl.create({
      message: 'Loading dashboard...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Load subscription data
      this.subscriptions.push(
        this.subscriptionService.getCurrentSubscription().subscribe({
          next: (sub) => {
            console.log('Subscription loaded:', sub);
          },
          error: (error) => {
            console.error('Failed to load subscription:', error);
          }
        })
      );

      // Load usage stats
      this.subscriptions.push(
        this.subscriptionService.getUsageStats().subscribe({
          next: (stats) => {
            this.usageStats = stats;
          },
          error: (error) => {
            console.error('Failed to load usage stats:', error);
          }
        })
      );

      // Load billing history
      this.subscriptions.push(
        this.subscriptionService.getBillingHistory().subscribe({
          next: (history) => {
            this.billingHistory = history;
          },
          error: (error) => {
            console.error('Failed to load billing history:', error);
          }
        })
      );

      await loading.dismiss();
    } catch (error) {
      await loading.dismiss();
      console.error('Error loading dashboard:', error);
    }
  }

  async doRefresh(event: any) {
    await this.loadDashboardData();
    event.target.complete();
  }

  async logout() {
    const alert = await this.alertCtrl.create({
      header: 'Confirm Logout',
      message: 'Are you sure you want to sign out?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          handler: () => {
            this.performLogout();
          }
        }
      ]
    });

    await alert.present();
  }

  private performLogout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        this.router.navigate(['/login']);
      }
    });
  }

  navigateToSubscription() {
    this.router.navigate(['/subscription']);
  }

  navigateToPricing() {
    this.router.navigate(['/pricing']);
  }

  async manageBilling() {
    const loading = await this.loadingCtrl.create({
      message: 'Opening billing portal...',
      spinner: 'crescent'
    });
    await loading.present();

    this.subscriptionService.getBillingPortalUrl().subscribe({
      next: async (response) => {
        await loading.dismiss();
        window.open(response.url, '_system');
      },
      error: async (error) => {
        await loading.dismiss();
        const alert = await this.alertCtrl.create({
          header: 'Error',
          message: 'Unable to open billing portal. Please try again.',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  async cancelSubscription() {
    const alert = await this.alertCtrl.create({
      header: 'Cancel Subscription',
      message: 'Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.',
      buttons: [
        {
          text: 'Keep Subscription',
          role: 'cancel'
        },
        {
          text: 'Cancel Subscription',
          role: 'destructive',
          handler: () => {
            this.performCancellation();
          }
        }
      ]
    });

    await alert.present();
  }

  private async performCancellation() {
    const loading = await this.loadingCtrl.create({
      message: 'Canceling subscription...',
      spinner: 'crescent'
    });
    await loading.present();

    this.subscriptionService.cancelSubscription(false).subscribe({
      next: async (sub) => {
        await loading.dismiss();
        const alert = await this.alertCtrl.create({
          header: 'Subscription Canceled',
          message: `Your subscription will remain active until ${new Date(sub.currentPeriodEnd!).toLocaleDateString()}.`,
          buttons: ['OK']
        });
        await alert.present();
      },
      error: async (error) => {
        await loading.dismiss();
        const alert = await this.alertCtrl.create({
          header: 'Error',
          message: 'Unable to cancel subscription. Please try again.',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  getApiUsageColor(): string {
    const percentage = this.apiUsagePercentage();
    if (percentage >= 90) return 'danger';
    if (percentage >= 75) return 'warning';
    return 'success';
  }

  getSubscriptionStatusColor(status: SubscriptionStatus): string {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return 'success';
      case SubscriptionStatus.TRIAL:
        return 'primary';
      case SubscriptionStatus.PAST_DUE:
        return 'danger';
      case SubscriptionStatus.CANCELED:
        return 'medium';
      case SubscriptionStatus.PAUSED:
        return 'warning';
      default:
        return 'medium';
    }
  }

  getPlanBadgeColor(plan: PlanType): string {
    switch (plan) {
      case PlanType.STARTER:
        return 'medium';
      case PlanType.GROWTH:
        return 'primary';
      case PlanType.SCALE:
        return 'secondary';
      case PlanType.ENTERPRISE:
        return 'tertiary';
      default:
        return 'medium';
    }
  }

  getDaysRemaining(): number {
    const sub = this.subscription();
    if (!sub) return 0;

    if (this.isTrial()) {
      return this.subscriptionService.getDaysRemainingInTrial(sub);
    }

    return this.subscriptionService.getDaysRemainingInBillingPeriod(sub);
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatCurrency(amount: number): string {
    return this.subscriptionService.formatPrice(amount);
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  getWelcomeMessage(): string {
    const user = this.currentUser();
    const name = user?.firstName || 'there';
    return `${this.getGreeting()}, ${name}!`;
  }
}
