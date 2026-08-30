import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../Interfaces/hospital.interface';

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  qualification: string;
  experienceYears: number;
  consultationFee: number;
  hospitalId: string;
  userId?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  phone: string;
  user: User;
}

export interface CreateDoctorDto {
  name: string;
  specialization: string;
  qualification: string;
  experienceYears: number;
  consultationFee: number;
  email: string;
  phone: string;
  password: string;
}

export interface UpdateDoctorDto {
  name?: string;
  specialization?: string;
  qualification?: string;
  experienceYears?: number;
  consultationFee?: number;
  email?: string;
  phone?: string;
  password?: string;
  isActive?: boolean;
}

export interface EmailAvailabilityResponse {
  available: boolean;
  message: string;
}

export interface PhoneAvailabilityResponse {
  available: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class DoctorService {
  private readonly baseUrl = `${environment.apiUrl}/doctors`;

  constructor(private http: HttpClient) {}

  // Get all doctors for the hospital
  getAll(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(this.baseUrl);
  }

  // Get doctor by ID
  getById(id: string): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.baseUrl}/${id}`);
  }

  // Create new doctor
  create(payload: CreateDoctorDto): Observable<Doctor> {
    return this.http.post<Doctor>(this.baseUrl, payload);
  }

  // Update doctor
update(id: string, payload: UpdateDoctorDto): Observable<Doctor> {
  return this.http.put<Doctor>(`${this.baseUrl}/${id}`, payload);
}

  // Soft delete doctor
  delete(id: string): Observable<{ message: string }> {
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

  // ✅ Check if email exists (returns boolean)
  async isEmailTaken(email: string, excludeUserId?: string): Promise<boolean> {
    try {
      const response = await this.checkEmailAvailability(email, excludeUserId).toPromise();
      return !response?.available;
    } catch (error) {
      console.error('Error checking email availability:', error);
      return true; // Assume taken if error
    }
  }

  // ✅ Check if phone exists (returns boolean)
  async isPhoneTaken(phone: string, excludeUserId?: string): Promise<boolean> {
    try {
      const response = await this.checkPhoneAvailability(phone, excludeUserId).toPromise();
      return !response?.available;
    } catch (error) {
      console.error('Error checking phone availability:', error);
      return true; // Assume taken if error
    }
  }

  // ✅ Get doctor by email
  getByEmail(email: string): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.baseUrl}/email/${encodeURIComponent(email)}`);
  }

  // ✅ Get doctor by phone
  getByPhone(phone: string): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.baseUrl}/phone/${encodeURIComponent(phone)}`);
  }

  // ✅ Bulk check availability for multiple fields
  checkBulkAvailability(email: string, phone: string, excludeUserId?: string): Observable<{
    email: EmailAvailabilityResponse;
    phone: PhoneAvailabilityResponse;
  }> {
    const params = new HttpParams()
      .set('email', email)
      .set('phone', phone)
      .set('excludeUserId', excludeUserId || '');
    
    return this.http.get<{
      email: EmailAvailabilityResponse;
      phone: PhoneAvailabilityResponse;
    }>(`${this.baseUrl}/check/bulk`, { params });
  }
}