import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, LoadingController, AlertController, Platform } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

interface LoginForm {
  email: FormControl<string>;
  password: FormControl<string>;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule]
})
export class LoginPage implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private loadingCtrl = inject(LoadingController);
  private alertCtrl = inject(AlertController);
  private platform = inject(Platform);

  loginForm: FormGroup<LoginForm>;
  showPassword = false;
  isLoading = false;

  constructor() {
    this.loginForm = this.fb.group<LoginForm>({
      email: new FormControl('', { validators: [Validators.required, Validators.email], nonNullable: true }),
      password: new FormControl('', { validators: [Validators.required, Validators.minLength(6)], nonNullable: true })
    });
  }

  ngOnInit() {
    // Check if already logged in
    if (this.authService.isAuthenticatedValue()) {
      this.router.navigate(['/dashboard']);
    }
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Signing in...',
      spinner: 'crescent'
    });
    await loading.present();

    this.authService.login(this.loginForm.getRawValue()).subscribe({
      next: async (response) => {
        await loading.dismiss();
        this.router.navigate(['/dashboard']);
      },
      error: async (error) => {
        await loading.dismiss();
        const alert = await this.alertCtrl.create({
          header: 'Login Failed',
          message: error.message || 'Invalid credentials. Please try again.',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  async loginWithGoogle() {
    const loading = await this.loadingCtrl.create({
      message: 'Connecting to Google...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.authService.loginWithGoogle();
      await loading.dismiss();
    } catch (error) {
      await loading.dismiss();
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: 'Unable to connect with Google. Please try again.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  async loginWithApple() {
    const loading = await this.loadingCtrl.create({
      message: 'Connecting to Apple...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.authService.loginWithApple();
      await loading.dismiss();
    } catch (error: any) {
      await loading.dismiss();

      // Don't show error if user cancelled
      if (error.message?.includes('cancelled')) {
        return;
      }

      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: error.message || 'Unable to connect with Apple. Please try again.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}