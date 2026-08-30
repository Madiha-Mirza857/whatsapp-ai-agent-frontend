import { environment } from './../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Hospital } from '../Interfaces/hospital.interface';

export interface EmailAvailabilityResponse {
  available: boolean;
  message: string;
}

export interface PhoneAvailabilityResponse {
  available: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class HospitalService {
  private readonly baseUrl = `${environment.apiUrl}/hospitals`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Hospital[]> {
    return this.http.get<Hospital[]>(this.baseUrl);
  }

  getById(id: string): Observable<Hospital> {
    return this.http.get<Hospital>(`${this.baseUrl}/${id}`);
  }

  register(payload: Partial<Hospital>): Observable<Hospital> {
    return this.http.post<Hospital>(`${this.baseUrl}/register`, payload);
  }

  update(id: string, payload: Partial<Hospital>): Observable<Hospital> {
    return this.http.patch<Hospital>(`${this.baseUrl}/${id}`, payload);
  }

  softDelete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }

  // ✅ Check email availability
  checkEmailAvailability(email: string, excludeUserId?: string): Observable<EmailAvailabilityResponse> {
    let params = new HttpParams().set('email', email);
    if (excludeUserId) {
      params = params.set('excludeUserId', excludeUserId);
    }
    return this.http.get<EmailAvailabilityResponse>(`${this.baseUrl}/check/email`, { params });
  }

  // ✅ Check phone availability
  checkPhoneAvailability(phone: string, excludeUserId?: string): Observable<PhoneAvailabilityResponse> {
    let params = new HttpParams().set('phone', phone);
    if (excludeUserId) {
      params = params.set('excludeUserId', excludeUserId);
    }
    return this.http.get<PhoneAvailabilityResponse>(`${this.baseUrl}/check/phone`, { params });
  }
}