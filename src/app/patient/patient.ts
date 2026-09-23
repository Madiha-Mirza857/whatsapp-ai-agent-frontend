// src/app/patient/patient-service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ============================================================
// INTERFACES
// ============================================================

export interface Patient {
  id: string;
  name: string;
  cnic?: string;
  phoneNumber: string;
  emergencyContact?: string;
  dateOfBirth?: Date;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  address?: string;
  notes?: string;
  allergies: string[];
  pastSurgeries: string[];
  chronicDiseases: string[];
  familyHistory?: string;
  socialHistory?: {
    smoking?: boolean;
    obesity?: boolean;
    alcohol?: boolean;
    occupation?: string;
  };
  hasDiabetes: boolean;
  hasHypertension: boolean;
  hasHeartDisease: boolean;
  isSmoker: boolean;
  isObese: boolean;
  isActive: boolean;
  isDeleted: boolean;
  hospitalId: string;
  createdAt: Date;
  updatedAt: Date;
  appointmentCount?: number;
  prescriptionCount?: number;
}

export interface CreatePatientDto {
  name: string;
  cnic?: string;
  phoneNumber: string;
  emergencyContact?: string;
  dateOfBirth?: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  notes?: string;
  allergies?: string[];
  pastSurgeries?: string[];
  chronicDiseases?: string[];
  familyHistory?: string;
  socialHistory?: {
    smoking?: boolean;
    obesity?: boolean;
    alcohol?: boolean;
    occupation?: string;
  };
  hasDiabetes?: boolean;
  hasHypertension?: boolean;
  hasHeartDisease?: boolean;
  isSmoker?: boolean;
  isObese?: boolean;
}

export interface UpdatePatientDto extends Partial<CreatePatientDto> {}

export interface PatientProfileResponse {
  id: string;
  name: string;
  phoneNumber: string;
  // ... all patient fields
  appointmentCount: number;
  prescriptionCount: number;
  appointments: any[];
  prescriptions: any[];
}

export interface AvailabilityResponse {
  available: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class PatientService {
  private readonly baseUrl = `${environment.apiUrl}/patients`;

  constructor(private http: HttpClient) {}

  // ============================================================
  // CRUD OPERATIONS
  // ============================================================

  // Get all patients
  getAll(): Observable<Patient[]> {
    return this.http.get<Patient[]>(this.baseUrl);
  }

  // Get patient by ID
  getById(id: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.baseUrl}/${id}`);
  }

  // Get patient profile with appointments & prescriptions
  getProfile(id: string): Observable<PatientProfileResponse> {
    return this.http.get<PatientProfileResponse>(`${this.baseUrl}/${id}/profile`);
  }

  // Create new patient
  create(payload: CreatePatientDto): Observable<Patient> {
    return this.http.post<Patient>(this.baseUrl, payload);
  }

  // Update patient (PUT)
  update(id: string, payload: UpdatePatientDto): Observable<Patient> {
    return this.http.put<Patient>(`${this.baseUrl}/${id}`, payload);
  }

  // Partial update (PATCH)
  patchUpdate(id: string, payload: UpdatePatientDto): Observable<Patient> {
    return this.http.patch<Patient>(`${this.baseUrl}/${id}`, payload);
  }

  // Soft delete patient
  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }

  // ============================================================
  // SEARCH
  // ============================================================

  search(params: { name?: string; cnic?: string; phoneNumber?: string }): Observable<Patient[]> {
    let httpParams = new HttpParams();
    if (params.name) httpParams = httpParams.set('name', params.name);
    if (params.cnic) httpParams = httpParams.set('cnic', params.cnic);
    if (params.phoneNumber) httpParams = httpParams.set('phoneNumber', params.phoneNumber);
    return this.http.get<Patient[]>(`${this.baseUrl}/search`, { params: httpParams });
  }

  // ============================================================
  // AVAILABILITY CHECKS
  // ============================================================

  //  Phone availability check REMOVED - no longer needed

  //  CNIC availability check only
  checkCnicAvailability(cnic: string, excludePatientId?: string): Observable<AvailabilityResponse> {
    let params = new HttpParams().set('cnic', cnic);
    if (excludePatientId) {
      params = params.set('excludePatientId', excludePatientId);
    }
    return this.http.get<AvailabilityResponse>(`${this.baseUrl}/check/cnic`, { params });
  }

  // ============================================================
  // FIND BY
  // ============================================================

  findByPhone(phone: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.baseUrl}/phone/${encodeURIComponent(phone)}`);
  }

  findByCnic(cnic: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.baseUrl}/cnic/${encodeURIComponent(cnic)}`);
  }

  // ============================================================
  // UTILITY
  // ============================================================

  updateLastVisit(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/visit`, {});
  }

  // Async helpers for forms
  async isCnicTaken(cnic: string, excludePatientId?: string): Promise<boolean> {
    try {
      const response = await this.checkCnicAvailability(cnic, excludePatientId).toPromise();
      return !response?.available;
    } catch (error) {
      console.error('Error checking CNIC availability:', error);
      return true;
    }
  }
}