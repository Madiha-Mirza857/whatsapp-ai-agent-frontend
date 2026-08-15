import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ToastService } from '../../Services/toastService';

import { Appointment, AppointmentService } from '../appointmentservice';
import { AppointmentCalendarComponent } from '../appointment-calendar-component/appointment-calendar-component';
import { AuthService } from '../../auth/auth-service';

@Component({
  selector: 'app-appointment-component',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink,AppointmentCalendarComponent],
  templateUrl: './appointment-component.html',
  styleUrl: './appointment-component.css',
})
export class AppointmentComponent implements OnInit {
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  isLoading = false;
  searchTerm = '';
  isAdmin = false;
  isDoctor = false;
  currentUser: any = null;

  statusFilter: string = 'all';
  statusOptions = ['all', 'pending_payment', 'confirmed', 'completed', 'cancelled_expired'];

  constructor(
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private toastService: ToastService,
  ) {}

  viewMode: 'list' | 'calendar' = 'list';

  setViewMode(mode: 'list' | 'calendar'): void {
    this.viewMode = mode;
  }
  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      this.isAdmin = this.currentUser.role === 'HOSPITAL_ADMIN' || this.currentUser.role === 'SUPER_ADMIN';
      this.isDoctor = this.currentUser.role === 'DOCTOR';
    }
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.isLoading = true;

    if (this.isAdmin) {
      this.appointmentService.getHospitalAppointments().subscribe({
        next: (res: any) => {
          // ✅ Fix: Handle both array and object responses
          this.appointments = Array.isArray(res) ? res : res?.data || [];
          this.filteredAppointments = [...this.appointments];
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading appointments:', err);
          this.toastService.show('Failed to load appointments', 'error');
          this.isLoading = false;
          this.appointments = [];
          this.filteredAppointments = [];
        },
      });
    } else if (this.isDoctor) {
      const doctorId = this.currentUser?.doctorId;
      if (doctorId) {
        this.appointmentService.getDoctorAppointments(doctorId).subscribe({
          next: (res: any) => {
            // ✅ Fix: Handle both array and object responses
            this.appointments = Array.isArray(res) ? res : res?.data || [];
            this.filteredAppointments = [...this.appointments];
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Error loading appointments:', err);
            this.toastService.show('Failed to load appointments', 'error');
            this.isLoading = false;
            this.appointments = [];
            this.filteredAppointments = [];
          },
        });
      }
    }
  }

  searchAppointments(): void {
    if (!this.searchTerm.trim() && this.statusFilter === 'all') {
      this.filteredAppointments = [...this.appointments];
    } else {
      const value = this.searchTerm.toLowerCase();
     this.filteredAppointments = this.appointments.filter(
  (a) =>
    (
      a.patientName?.toLowerCase().includes(value) ||
      a.patientPhone?.toLowerCase().includes(value) ||
      a.doctor?.name?.toLowerCase().includes(value) ||
      a.doctor?.specialization?.toLowerCase().includes(value) ||
      a.slot?.startTime?.toString().toLowerCase().includes(value) ||
      a.slot?.endTime?.toString().toLowerCase().includes(value)
    ) &&
    (this.statusFilter === 'all' || a.status === this.statusFilter)
);

    }
  }

  onStatusFilterChange(): void {
    this.searchAppointments();
  }

  cancelAppointment(id: string): void {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    this.appointmentService.cancelAppointment(id).subscribe({
      next: () => {
        this.toastService.show('Appointment cancelled successfully', 'success');
        this.loadAppointments();
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Failed to cancel appointment', 'error');
      },
    });
  }

  completeAppointment(id: string): void {
    if (!confirm('Mark this appointment as completed?')) {
      return;
    }

    this.appointmentService.completeAppointment(id).subscribe({
      next: () => {
        this.toastService.show('Appointment marked as completed', 'success');
        this.loadAppointments();
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Failed to complete appointment', 'error');
      },
    });
  }

  getStatusBadge(status: string): string {
    const badges: { [key: string]: string } = {
      pending_payment: 'badge-pending',
      confirmed: 'badge-confirmed',
      completed: 'badge-completed',
      cancelled_expired: 'badge-cancelled',
    };
    return badges[status] || 'badge-pending';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending_payment: 'Pending Payment',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled_expired: 'Cancelled/Expired',
    };
    return labels[status] || status;
  }

  formatDate(date: Date): string {
    return date ? new Date(date).toLocaleDateString() : 'N/A';
  }

  formatTime(date: Date): string {
    return date ? new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
  }

  getDoctorName(appointment: Appointment): string {
    return appointment.doctor?.name || 'N/A';
  }

  getDoctorSpec(appointment: Appointment): string {
    return appointment.doctor?.specialization || 'N/A';
  }

  getFee(appointment: Appointment): number {
    return appointment.doctor?.consultationFee || 0;
  }

  canCancel(appointment: Appointment): boolean {
    return this.isAdmin || (this.isDoctor && appointment.status === 'pending_payment');
  }

  canComplete(appointment: Appointment): boolean {
    return (this.isAdmin || this.isDoctor) && appointment.status === 'confirmed';
  }
}