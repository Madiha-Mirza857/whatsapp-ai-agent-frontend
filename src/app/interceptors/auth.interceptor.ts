import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastService } from '../Services/toastService';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private toastService: ToastService,
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Get token from localStorage
    console.log('🚀 INTERCEPTOR CALLED!');
    const token = localStorage.getItem('access_token');

    
  console.log('🔑 Token:', token ? 'Present' : 'Missing');

  if (token) {
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('✅ Authorization header added');
  }
    
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized
        if (error.status === 401) {
          console.error('Authentication failed:', error);
          
          // Show error message
          if (this.toastService) {
            this.toastService.show('Session expired. Please login again.', 'error');
          }
          
          // Clear storage and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      }),
    );
  }
}