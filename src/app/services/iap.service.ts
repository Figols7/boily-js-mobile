import { Injectable, inject } from '@angular/core';
import { Platform } from '@ionic/angular';
// TODO: Install correct in-app purchases plugin
// import { InAppPurchases, IAPProduct, PurchaseResult } from '@capacitor-community/in-app-purchases';
import { AuthService } from './auth.service';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';

// Temporary types until plugin is installed
interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
}

interface PurchaseResult {
  success?: boolean;
  receipt?: string;
  productId?: string;
  transactionId?: string;
}

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

  private http = inject(HttpClient);
  private platform = inject(Platform);
  private authService = inject(AuthService);

  constructor() {}

  async initialize(): Promise<void> {
    if (!this.platform.is('capacitor')) {
      console.log('IAP not available on web platform');
      return;
    }

    // TODO: Uncomment when in-app purchases plugin is installed
    // try {
    //   await InAppPurchases.initialize();
    //   const products = await this.getProducts();
    //   console.log('Available products:', products);
    //   await this.restorePurchases();
    // } catch (error) {
    //   console.error('Failed to initialize IAP:', error);
    // }
  }

  async getProducts(): Promise<IAPProduct[]> {
    // TODO: Uncomment when in-app purchases plugin is installed
    // try {
    //   const result = await InAppPurchases.getProducts({
    //     productIds: Object.values(this.PRODUCT_IDS)
    //   });
    //   return result.products;
    // } catch (error) {
    //   console.error('Failed to get products:', error);
    //   return [];
    // }
    return [];
  }

  async purchaseSubscription(productId: string): Promise<boolean> {
    // TODO: Uncomment when in-app purchases plugin is installed
    // try {
    //   const result = await InAppPurchases.purchaseProduct({ productId });
    //   if (result.success) {
    //     const verified = await this.verifyPurchaseWithBackend(result);
    //     if (verified) {
    //       await this.authService.getCurrentUser().toPromise();
    //       return true;
    //     }
    //   }
    //   return false;
    // } catch (error) {
    //   console.error('Purchase failed:', error);
    //   throw error;
    // }
    throw new Error('In-app purchases not yet configured');
  }

  async restorePurchases(): Promise<void> {
    // TODO: Uncomment when in-app purchases plugin is installed
    // try {
    //   const result = await InAppPurchases.restorePurchases();
    //   if (result.purchases && result.purchases.length > 0) {
    //     for (const purchase of result.purchases) {
    //       await this.verifyPurchaseWithBackend(purchase);
    //     }
    //     await this.authService.getCurrentUser().toPromise();
    //   }
    // } catch (error) {
    //   console.error('Failed to restore purchases:', error);
    // }
  }

  private async verifyPurchaseWithBackend(purchase: PurchaseResult): Promise<boolean> {
    try {
      const response = await this.http.post<any>(`http://localhost:3000/api/subscriptions/verify-apple`, {
        receipt: purchase.receipt,
        productId: purchase.productId,
        transactionId: purchase.transactionId
      }).toPromise();

      return response?.success || false;
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