import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, LoadingController, AlertController } from '@ionic/angular';
import { IapService, SubscriptionTier } from '../../services/iap.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-subscription',
  templateUrl: './subscription.page.html',
  styleUrls: ['./subscription.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class SubscriptionPage implements OnInit {
  subscriptionTiers: SubscriptionTier[] = [];
  currentSubscription: any = null;
  isLoading = false;

  constructor(
    private iapService: IapService,
    private authService: AuthService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadSubscriptionData();
  }

  async loadSubscriptionData() {
    this.subscriptionTiers = this.iapService.subscriptionTiers;
    this.currentSubscription = await this.iapService.getCurrentSubscription();
  }

  async purchaseSubscription(tier: SubscriptionTier) {
    const loading = await this.loadingCtrl.create({
      message: 'Procesando suscripción...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const success = await this.iapService.purchaseSubscription(tier.productId);

      if (success) {
        await loading.dismiss();

        const alert = await this.alertCtrl.create({
          header: '¡Suscripción activada!',
          message: `Tu suscripción ${tier.name} está ahora activa. Disfruta de todas las funciones premium.`,
          buttons: [
            {
              text: 'Comenzar',
              handler: () => {
                this.router.navigate(['/dashboard']);
              }
            }
          ]
        });
        await alert.present();

        // Refresh subscription status
        await this.loadSubscriptionData();
      } else {
        await loading.dismiss();
        await this.showErrorAlert('No se pudo completar la suscripción. Por favor, intenta de nuevo.');
      }
    } catch (error: any) {
      await loading.dismiss();

      if (error.message?.includes('cancelled')) {
        return; // User cancelled, no need to show error
      }

      await this.showErrorAlert('Error al procesar la suscripción: ' + error.message);
    }
  }

  async restorePurchases() {
    const loading = await this.loadingCtrl.create({
      message: 'Restaurando compras...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.iapService.restorePurchases();
      await this.loadSubscriptionData();
      await loading.dismiss();

      const alert = await this.alertCtrl.create({
        header: 'Compras restauradas',
        message: 'Tus suscripciones han sido restauradas exitosamente.',
        buttons: ['OK']
      });
      await alert.present();
    } catch (error) {
      await loading.dismiss();
      await this.showErrorAlert('No se encontraron compras previas para restaurar.');
    }
  }

  async manageSubscription() {
    const alert = await this.alertCtrl.create({
      header: 'Gestionar suscripción',
      message: 'Para gestionar tu suscripción, ve a Configuración > Apple ID > Suscripciones en tu dispositivo.',
      buttons: [
        'Cancelar',
        {
          text: 'Abrir Configuración',
          handler: () => {
            window.open('https://apps.apple.com/account/subscriptions', '_system');
          }
        }
      ]
    });
    await alert.present();
  }

  private async showErrorAlert(message: string) {
    const alert = await this.alertCtrl.create({
      header: 'Error',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  getFeatureIcon(feature: string): string {
    if (feature.includes('notificaciones')) return 'notifications';
    if (feature.includes('tiempo real')) return 'flash';
    if (feature.includes('filtros')) return 'funnel';
    if (feature.includes('análisis')) return 'analytics';
    if (feature.includes('soporte')) return 'headset';
    return 'checkmark-circle';
  }
}