import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, LoadingController, AlertController, Platform } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule]
})
export class RegisterPage implements OnInit {
  registerForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  passwordStrength = 0;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private platform: Platform
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      termsAccepted: [false, [Validators.requiredTrue]]
    }, { validators: this.passwordMatchValidator });

    // Watch password changes for strength meter
    this.registerForm.get('password')?.valueChanges.subscribe(password => {
      this.passwordStrength = this.calculatePasswordStrength(password);
    });
  }

  ngOnInit() {
    // Check if already logged in
    if (this.authService.isAuthenticatedValue()) {
      this.router.navigate(['/dashboard']);
    }
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Creating your account...',
      spinner: 'crescent'
    });
    await loading.present();

    const { confirmPassword, termsAccepted, ...registerData } = this.registerForm.value;

    this.authService.register(registerData).subscribe({
      next: async (response) => {
        await loading.dismiss();

        const alert = await this.alertCtrl.create({
          header: 'Welcome!',
          message: 'Your account has been created successfully.',
          buttons: [
            {
              text: 'Get Started',
              handler: () => {
                this.router.navigate(['/dashboard']);
              }
            }
          ]
        });
        await alert.present();
      },
      error: async (error) => {
        await loading.dismiss();
        const alert = await this.alertCtrl.create({
          header: 'Registration Failed',
          message: error.message || 'Unable to create account. Please try again.',
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

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  // Custom validator for password match
  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  // Calculate password strength (0-100)
  private calculatePasswordStrength(password: string): number {
    if (!password) return 0;

    let strength = 0;

    // Length
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 15;

    // Contains lowercase
    if (/[a-z]/.test(password)) strength += 15;

    // Contains uppercase
    if (/[A-Z]/.test(password)) strength += 15;

    // Contains numbers
    if (/\d/.test(password)) strength += 15;

    // Contains special characters
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 15;

    return Math.min(strength, 100);
  }

  getPasswordStrengthColor(): string {
    if (this.passwordStrength < 40) return 'danger';
    if (this.passwordStrength < 70) return 'warning';
    return 'success';
  }

  getPasswordStrengthText(): string {
    if (this.passwordStrength < 40) return 'Weak';
    if (this.passwordStrength < 70) return 'Medium';
    return 'Strong';
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

  // Helper methods for validation errors
  get emailErrors(): string | null {
    const control = this.registerForm.get('email');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'Email is required';
      if (control.errors['email']) return 'Please enter a valid email';
    }
    return null;
  }

  get passwordErrors(): string | null {
    const control = this.registerForm.get('password');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'Password is required';
      if (control.errors['minlength']) return 'Password must be at least 6 characters';
    }
    return null;
  }

  get confirmPasswordErrors(): string | null {
    const control = this.registerForm.get('confirmPassword');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'Please confirm your password';
    }
    if (this.registerForm.errors?.['passwordMismatch'] && control?.touched) {
      return 'Passwords do not match';
    }
    return null;
  }

  get firstNameErrors(): string | null {
    const control = this.registerForm.get('firstName');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'First name is required';
      if (control.errors['minlength']) return 'First name must be at least 2 characters';
    }
    return null;
  }

  get lastNameErrors(): string | null {
    const control = this.registerForm.get('lastName');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'Last name is required';
      if (control.errors['minlength']) return 'Last name must be at least 2 characters';
    }
    return null;
  }
}
