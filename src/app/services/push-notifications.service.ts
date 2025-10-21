import { Injectable, inject } from '@angular/core';
import { Platform } from '@ionic/angular';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
  PermissionStatus
} from '@capacitor/push-notifications';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../config/app.config.token';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class PushNotificationsService {
  private config = inject(APP_CONFIG);
  private platform = inject(Platform);
  private http = inject(HttpClient);

  private readonly API_URL = this.config.apiUrl;
  private deviceToken: string | null = null;

  constructor() {}

  async initialize(): Promise<void> {
    if (!this.platform.is('capacitor')) {
      console.log('Push notifications not available on web platform');
      return;
    }

    await this.requestPermissions();
    await this.registerListeners();
  }

  private async requestPermissions(): Promise<void> {
    try {
      const permission = await PushNotifications.requestPermissions();

      if (permission.receive === 'granted') {
        // Register with Apple / Google to receive push via APNS/FCM
        await PushNotifications.register();
      } else {
        console.log('Push notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting push permissions:', error);
    }
  }

  private async registerListeners(): Promise<void> {
    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token:', token.value);
      this.deviceToken = token.value;
      this.sendTokenToServer(token.value).subscribe({
        next: () => console.log('Token sent to server'),
        error: (error) => console.error('Failed to send token to server:', error)
      });
    });

    // Some issue with our setup and push will not work
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration:', JSON.stringify(error));
    });

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        this.handleNotificationReceived(notification);
      }
    );

    // Method called when tapping on a notification
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        console.log('Push notification action performed:', notification);
        this.handleNotificationAction(notification);
      }
    );
  }

  private handleNotificationReceived(notification: PushNotificationSchema): void {
    // Handle foreground notification
    // You can show a custom alert or update UI
    console.log('Notification data:', notification.data);
    console.log('Notification body:', notification.body);
    console.log('Notification title:', notification.title);
  }

  private handleNotificationAction(notification: ActionPerformed): void {
    // Handle notification tap
    const data = notification.notification.data;

    // Route user based on notification type
    if (data && data.route) {
      // Use Angular Router to navigate
      // this.router.navigate([data.route]);
      console.log('Should navigate to:', data.route);
    }
  }

  // Send device token to your backend
  private sendTokenToServer(token: string): Observable<any> {
    return this.http.post(`${this.API_URL}/notifications/register-device`, {
      token,
      platform: this.getPlatform()
    });
  }

  // Unregister device token
  unregisterDevice(): Observable<any> {
    if (!this.deviceToken) {
      throw new Error('No device token to unregister');
    }

    return this.http.post(`${this.API_URL}/notifications/unregister-device`, {
      token: this.deviceToken
    });
  }

  // Check current permission status
  async checkPermissions(): Promise<PermissionStatus> {
    return await PushNotifications.checkPermissions();
  }

  // Get all delivered notifications
  async getDeliveredNotifications(): Promise<PushNotificationSchema[]> {
    const notificationList = await PushNotifications.getDeliveredNotifications();
    return notificationList.notifications;
  }

  // Remove delivered notifications
  async removeDeliveredNotifications(notifications: PushNotificationSchema[]): Promise<void> {
    await PushNotifications.removeDeliveredNotifications({ notifications });
  }

  // Remove all delivered notifications
  async removeAllDeliveredNotifications(): Promise<void> {
    await PushNotifications.removeAllDeliveredNotifications();
  }

  // Get current device token
  getDeviceToken(): string | null {
    return this.deviceToken;
  }

  private getPlatform(): string {
    if (this.platform.is('ios')) return 'ios';
    if (this.platform.is('android')) return 'android';
    return 'web';
  }

  // Test notification (for development)
  sendTestNotification(): Observable<any> {
    if (!this.deviceToken) {
      throw new Error('No device token available');
    }

    return this.http.post(`${this.API_URL}/notifications/send-test`, {
      token: this.deviceToken,
      notification: {
        title: 'Test Notification',
        body: 'This is a test notification from BoilyJS',
        data: {
          route: '/dashboard'
        }
      }
    });
  }
}
