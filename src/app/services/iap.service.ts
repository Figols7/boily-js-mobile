import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { InAppPurchases, IAPProduct, PurchaseResult } from '@capacitor-community/in-app-purchases';
import { AuthService } from './auth.service';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SubscriptionTier {
  id: string;
  name: string;
  price: string;
  duration: string;
  features: string[];
  productId: string;
}

@Injectable({
  providedIn: 'root'
})
export class IapService {
  private readonly PRODUCT_IDS = {
    PROFESSIONAL_MONTHLY: 'grantwatch_professional_monthly',
    PROFESSIONAL_YEARLY: 'grantwatch_professional_yearly',
    ENTERPRISE_MONTHLY: 'grantwatch_enterprise_monthly',
    ENTERPRISE_YEARLY: 'grantwatch_enterprise_yearly'
  };

  public subscriptionTiers: SubscriptionTier[] = [
    {
      id: 'professional_monthly',
      name: 'Profesional',
      price: '€9.99',
      duration: 'mes',
      features: [
        'Notificaciones ilimitadas',
        'Alertas en tiempo real',
        'Filtros avanzados',
        'Análisis de tendencias',
        'Soporte prioritario'
      ],
      productId: this.PRODUCT_IDS.PROFESSIONAL_MONTHLY
    },
    {
      id: 'professional_yearly',
      name: 'Profesional Anual',
      price: '€99.99',
      duration: 'año',
      features: [
        'Todo lo de Profesional',
        '2 meses gratis',
        'Descuento del 17%'
      ],
      productId: this.PRODUCT_IDS.PROFESSIONAL_YEARLY
    }
  ];

  constructor(
    private platform: Platform,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  async initialize(): Promise<void> {
    if (!this.platform.is('capacitor')) {
      console.log('IAP not available on web platform');
      return;
    }

    try {
      // Initialize the IAP plugin
      await InAppPurchases.initialize();

      // Get available products
      const products = await this.getProducts();
      console.log('Available products:', products);

      // Restore purchases for existing users
      await this.restorePurchases();
    } catch (error) {
      console.error('Failed to initialize IAP:', error);
    }
  }

  async getProducts(): Promise<IAPProduct[]> {
    try {
      const result = await InAppPurchases.getProducts({
        productIds: Object.values(this.PRODUCT_IDS)
      });
      return result.products;
    } catch (error) {
      console.error('Failed to get products:', error);
      return [];
    }
  }

  async purchaseSubscription(productId: string): Promise<boolean> {
    try {
      const result = await InAppPurchases.purchaseProduct({
        productId: productId
      });

      if (result.success) {
        // Verify purchase with your backend
        const verified = await this.verifyPurchaseWithBackend(result);

        if (verified) {
          // Update local user state
          await this.authService.getCurrentUser().toPromise();
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Purchase failed:', error);
      throw error;
    }
  }

  async restorePurchases(): Promise<void> {
    try {
      const result = await InAppPurchases.restorePurchases();

      if (result.purchases && result.purchases.length > 0) {
        // Verify each restored purchase
        for (const purchase of result.purchases) {
          await this.verifyPurchaseWithBackend(purchase);
        }

        // Refresh user state
        await this.authService.getCurrentUser().toPromise();
      }
    } catch (error) {
      console.error('Failed to restore purchases:', error);
    }
  }

  private async verifyPurchaseWithBackend(purchase: PurchaseResult): Promise<boolean> {
    try {
      const response = await this.http.post<any>(`${environment.apiUrl}/api/subscriptions/verify-apple`, {
        receipt: purchase.receipt,
        productId: purchase.productId,
        transactionId: purchase.transactionId
      }).toPromise();

      return response.success;
    } catch (error) {
      console.error('Failed to verify purchase with backend:', error);
      return false;
    }
  }

  async getCurrentSubscription(): Promise<any> {
    // This will be handled by your auth service
    const user = this.authService.getCurrentUserValue();
    return user?.subscription;
  }

  async cancelSubscription(): Promise<void> {
    // On iOS, users must cancel through Settings
    // You can only provide guidance
    throw new Error('Please cancel your subscription through iOS Settings > Apple ID > Subscriptions');
  }

  getSubscriptionManagementUrl(): string {
    // iOS opens Settings automatically
    return 'https://apps.apple.com/account/subscriptions';
  }
}