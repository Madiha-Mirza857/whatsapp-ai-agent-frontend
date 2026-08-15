import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Appointment {
  id: string;
  patientPhone: string;
  patientName: string;
  status: 'pending_payment' | 'confirmed' | 'cancelled_expired' | 'completed';
  reservedUntil?: Date;
  paymentMethod?: string;
  paymentReference?: string;
  hospitalId: string;
  doctorId: string;
  slotId: string;
  createdAt: Date;
  updatedAt: Date;
  doctor?: {
    id: string;
    name: string;
    specialization: string;
    consultationFee: number;
  };
  slot?: {
    id: string;
    startTime: Date;
    endTime: Date;
    status: string;
  };
}

export interface CreateAppointmentDto {
  patientPhone: string;
  patientName: string;
  doctorId: string;
  slotId: string;
}

export interface BookAppointmentDto {
  paymentMethod: string;
  paymentReference?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private readonly baseUrl = `${environment.apiUrl}/appointments`;

  constructor(private http: HttpClient) {}

  // Reserve appointment (Patient booking)
  reserveAppointment(payload: CreateAppointmentDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/reserve`, payload);
  }

  // Confirm appointment after payment
  confirmAppointment(id: string, payload: BookAppointmentDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/confirm/${id}`, payload);
  }

  // Get available slots
  getAvailableSlots(doctorId: string, date?: string): Observable<any> {
    let params = new HttpParams().set('doctorId', doctorId);
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get(`${this.baseUrl}/slots/available`, { params });
  }

  // Get all appointments for hospital (Admin)
  getHospitalAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/hospital/all`);
  }

  // Get appointments by doctor (Doctor)
  getDoctorAppointments(doctorId: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/doctor/${doctorId}`);
  }

  // Get appointments by patient phone
  getPatientAppointments(phone: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/patient/${phone}`);
  }

  // Get single appointment
  getAppointmentById(id: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.baseUrl}/${id}`);
  }

  // Cancel appointment
  cancelAppointment(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  // Complete appointment (Admin/Doctor)
  completeAppointment(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/complete`, {});
  }
}