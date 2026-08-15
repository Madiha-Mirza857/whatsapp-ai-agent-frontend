import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  email:string
  phone:string
  user:User
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
    return this.http.patch<Doctor>(`${this.baseUrl}/${id}`, payload);
  }

  // Soft delete doctor
  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}