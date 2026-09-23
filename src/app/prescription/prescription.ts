// src/app/prescription/prescription.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ============================================================
// INTERFACES
// ============================================================

export interface Medicine {
  id?: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  timing?: string;
  instructions?: string;
  notes?: string;
}

export interface Prescription {
  id: string;
  prescriptionNumber: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  appointmentId?: string;
  chiefComplaints: string;
  examination?: string;
  diagnosis: string;
  advice?: string;
  notes?: string;
  medicines: Medicine[];
  followUpDate?: Date;
  followUpNotes?: string;
  status: 'active' | 'expired' | 'completed' | 'cancelled';
  isPrinted: boolean;
  printedAt?: Date;
  sentToPatient: boolean;
  sentAt?: Date;
  deliveryMethod?: string;
  hospitalId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePrescriptionDto {
  patientId: string;
  appointmentId?: string;
  chiefComplaints: string;
  examination?: string;
  diagnosis: string;
  advice?: string;
  notes?: string;
  medicines: Medicine[];
  followUpDate?: string;
  followUpNotes?: string;
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    weight?: number;
    height?: number;
    bmi?: number;
  };
}

export interface UpdatePrescriptionDto {
  chiefComplaints?: string;
  examination?: string;
  diagnosis?: string;
  advice?: string;
  notes?: string;
  medicines?: Medicine[];
  followUpDate?: string;
  followUpNotes?: string;
  status?: 'active' | 'expired' | 'completed' | 'cancelled';
}

export interface SearchPrescriptionDto {
  patientId?: string;
  doctorId?: string;
  prescriptionNumber?: string;
  patientPhone?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface PrescriptionListResponse {
  data: Prescription[];
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class PrescriptionService {
  private readonly baseUrl = `${environment.apiUrl}/prescriptions`;

  constructor(private http: HttpClient) {}

  // ============================================================
  // CRUD OPERATIONS
  // ============================================================

  // Get all prescriptions (paginated)
  getAll(page = 1, limit = 20): Observable<PrescriptionListResponse> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));
    return this.http.get<PrescriptionListResponse>(this.baseUrl, { params });
  }

  // Get prescription by ID
  getById(id: string): Observable<Prescription> {
    return this.http.get<Prescription>(`${this.baseUrl}/${id}`);
  }

  // Get prescription by number
  getByNumber(number: string): Observable<Prescription> {
    return this.http.get<Prescription>(`${this.baseUrl}/number/${number}`);
  }

  // Get prescriptions by patient
  getByPatient(patientId: string): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${this.baseUrl}/patient/${patientId}`);
  }

  // Get patient prescription history (paginated)
  getPatientHistory(patientId: string, page = 1, limit = 10): Observable<PrescriptionListResponse> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));
    return this.http.get<PrescriptionListResponse>(
      `${this.baseUrl}/patient/${patientId}/history`,
      { params }
    );
  }

  // Get prescriptions by doctor
  getByDoctor(doctorId: string): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${this.baseUrl}/doctor/${doctorId}`);
  }

  // Create prescription
  create(payload: CreatePrescriptionDto): Observable<Prescription> {
    return this.http.post<Prescription>(this.baseUrl, payload);
  }

  // Update prescription (PUT)
  update(id: string, payload: UpdatePrescriptionDto): Observable<Prescription> {
    return this.http.put<Prescription>(`${this.baseUrl}/${id}`, payload);
  }

  // Partial update (PATCH)
  patchUpdate(id: string, payload: UpdatePrescriptionDto): Observable<Prescription> {
    return this.http.patch<Prescription>(`${this.baseUrl}/${id}`, payload);
  }

  // Soft delete prescription
  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }

  // ============================================================
  // ACTIONS
  // ============================================================

  // Mark as printed
  markAsPrinted(id: string): Observable<Prescription> {
    return this.http.post<Prescription>(`${this.baseUrl}/${id}/print`, {});
  }

  // Mark as sent to patient
  markAsSentToPatient(id: string, deliveryMethod = 'whatsapp'): Observable<Prescription> {
    return this.http.post<Prescription>(`${this.baseUrl}/${id}/send`, { deliveryMethod });
  }

  // ============================================================
  // SEARCH
  // ============================================================

  search(params: SearchPrescriptionDto): Observable<Prescription[]> {
    let httpParams = new HttpParams();
    if (params.patientId) httpParams = httpParams.set('patientId', params.patientId);
    if (params.doctorId) httpParams = httpParams.set('doctorId', params.doctorId);
    if (params.prescriptionNumber) httpParams = httpParams.set('prescriptionNumber', params.prescriptionNumber);
    if (params.patientPhone) httpParams = httpParams.set('patientPhone', params.patientPhone);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);
    return this.http.get<Prescription[]>(`${this.baseUrl}/search`, { params: httpParams });
  }

  // ============================================================
  // UTILITY HELPERS
  // ============================================================

  // Generate prescription display number
  getDisplayNumber(prescription: Prescription): string {
    return prescription.prescriptionNumber || `RX-${prescription.id.slice(0, 8)}`;
  }

  // Get status badge color
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: 'green',
      expired: 'orange',
      completed: 'blue',
      cancelled: 'red',
    };
    return colors[status] || 'gray';
  }

  // Get status label
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: 'Active',
      expired: 'Expired',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  }

  // Format medicines for display
  formatMedicines(medicines: Medicine[]): string {
    if (!medicines || medicines.length === 0) return 'No medicines';
    return medicines.map(m => `${m.name} (${m.dosage})`).join(', ');
  }
}