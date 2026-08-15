import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, ReplaySubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'HOSPITAL_ADMIN' | 'DOCTOR' | 'PATIENT';
  hospitalId?: string;
  doctorId?: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly baseUrl = `${environment.apiUrl}/auth`;
  
  // Use ReplaySubject to replay the last value to new subscribers
  private currentUserSubject = new ReplaySubject<User | null>(1);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  // Keep track of current user value
  private currentUserValue: User | null = null;

  constructor(private http: HttpClient) {
    // Load user from localStorage on init
    const savedUser = this.getUser();
    if (savedUser) {
      console.log('🔄 AuthService initialized with saved user:', savedUser);
      this.currentUserValue = savedUser;
      this.currentUserSubject.next(savedUser);
    } else {
      console.log('🔄 AuthService initialized with no user');
      this.currentUserSubject.next(null);
    }
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    console.log('📤 Sending login request:', { 
      url: `${this.baseUrl}/login`, 
      email: credentials.email 
    });

    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap({
        next: (response) => {
          console.log('📥 Login response received');
          console.log('🔑 Access Token:', response.access_token);
          
          // Store token and user
          this.setToken(response.access_token);
          this.setUser(response.user);
        },
        error: (error) => {
          console.error('❌ Login request failed:', error);
          if (error.error) {
            console.error('❌ Server error details:', error.error);
          }
        }
      })
    );
  }

  // Get authorization header
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  // Get current user synchronously
  getCurrentUser(): User | null {
    console.log('📋 getCurrentUser called, returning:', this.currentUserValue);
    return this.currentUserValue;
  }

  // Get current user as observable
  getCurrentUser$(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  setToken(token: string): void {
    localStorage.setItem('access_token', token);
    console.log('💾 Token stored in localStorage');
  }

  getToken(): string | null {
    const token = localStorage.getItem('access_token');
    if (token) {
      console.log('🔑 Token retrieved from localStorage');
    }
    return token;
  }

  setUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    console.log('👤 User data stored in localStorage:', user);
    
    // Update local value
    this.currentUserValue = user;
    
    // Update subject - this will notify all subscribers
    console.log('📢 Emitting user update to subscribers...');
    this.currentUserSubject.next(user);
  }

  getUser(): User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn(): boolean {
    const hasToken = !!this.getToken();
    console.log(`🔐 Is logged in: ${hasToken}`);
    return hasToken;
  }

  logout(): void {
    console.log('🚪 Logging out...');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    
    // Update local value
    this.currentUserValue = null;
    
    // Update subject with null
    this.currentUserSubject.next(null);
    console.log('🚪 User logged out');
  }

  getRole(): string | null {
    const user = this.getCurrentUser();
    console.log('👤 User role:', user?.role);
    return user?.role || null;
  }

  hasRole(role: string | string[]): boolean {
    const userRole = this.getRole();
    if (!userRole) return false;
    if (Array.isArray(role)) {
      return role.includes(userRole);
    }
    return userRole === role;
  }
}