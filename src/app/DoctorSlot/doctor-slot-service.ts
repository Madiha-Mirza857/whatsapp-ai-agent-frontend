import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DoctorSlot {
  id: string;
  doctorId: string;
  hospitalId: string;
  startTime: string;
  endTime: string;
  status: 'available' | 'reserved' | 'booked';
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  doctor?: {
    id: string;
    name: string;
    specialization: string;
  };
}

export interface GenerateSlotsDto {
  doctorId?: string;
  date: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

export interface GenerateBulkSlotsDto {
  doctorIds?: string[];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

export interface UpdateSlotDto {
  status?: 'available' | 'reserved' | 'booked';
  startTime?: string;
  endTime?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DoctorSlotService {
  private readonly baseUrl = `${environment.apiUrl}/doctor-slots`;

  constructor(private http: HttpClient) {}

  // Generate slots for a single doctor
  generateSlots(payload: GenerateSlotsDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/generate`, payload);
  }

  // Generate bulk slots (admin only)
  generateBulkSlots(payload: GenerateBulkSlotsDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/generate-bulk`, payload);
  }

  // Preview bulk generation (admin only)
  previewBulkSlots(payload: GenerateBulkSlotsDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/generate-bulk/preview`, payload);
  }

  // Get all slots
  getAllSlots(params?: { doctorId?: string; date?: string; status?: string }): Observable<DoctorSlot[]> {
    return this.http.get<DoctorSlot[]>(this.baseUrl, { params });
  }

  // Get single slot
  getSlotById(id: string): Observable<DoctorSlot> {
    return this.http.get<DoctorSlot>(`${this.baseUrl}/${id}`);
  }

  // Update slot
  updateSlot(id: string, payload: UpdateSlotDto): Observable<DoctorSlot> {
    return this.http.patch<DoctorSlot>(`${this.baseUrl}/${id}`, payload);
  }

  // Delete slot (admin only)
  deleteSlot(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}