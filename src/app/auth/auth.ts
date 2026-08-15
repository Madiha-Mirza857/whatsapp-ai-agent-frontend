import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './auth-service';
import { ToastService } from '../Services/toastService';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './auth.html',
  styleUrls: ['./auth.css'], // ✅ Make sure this is correct
})
export class Auth implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  showPassword = false;
  loginError = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      const role = this.authService.getRole();
      this.redirectByRole(role);
      return;
    }

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['email']) return 'Please enter a valid email';
      if (field.errors['minlength']) {
        return `Minimum ${field.errors['minlength'].requiredLength} characters required`;
      }
    }
    return '';
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.loginError = '';

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.authService.setToken(response.access_token);
        this.authService.setUser(response.user);
        this.toastService.show('Login successful! Welcome back.', 'success');
        this.redirectByRole(response.user.role);
      },
      error: (err) => {
        this.isLoading = false;
        this.loginError = err.error?.message || 'Invalid email or password. Please try again.';
        this.toastService.show(this.loginError, 'error');
      },
    });
  }

  private redirectByRole(role: string | null): void {
    if (!role) {
      this.router.navigate(['/login']);
      return;
    }

    switch (role) {
      case 'SUPER_ADMIN':
        this.router.navigate(['/super-admin/dashboard']);
        break;
      case 'HOSPITAL_ADMIN':
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'DOCTOR':
        this.router.navigate(['/doctor/dashboard']);
        break;
      default:
        this.router.navigate(['/']);
    }
  }
}