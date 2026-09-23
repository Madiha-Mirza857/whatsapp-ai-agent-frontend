// src/app/prescription/prescription-list/prescription-list.ts
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ToastService } from '../../Services/toastService';
import { Prescription, PrescriptionService } from '../prescription';
import { TableNavigationDirective } from '../../Directives/TableNavigation';

@Component({
  selector: 'app-prescription-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TableNavigationDirective],
  templateUrl: './prescription-list.html',
  styleUrl: './prescription-list.css',
})
export class PrescriptionList implements OnInit {
  search = '';
  prescriptionsList: Prescription[] = [];
  filteredPrescriptions: Prescription[] = [];
  updatingStatus: { [key: string]: boolean } = {};

  // ✅ Status color mapping
  statusColors: { [key: string]: string } = {
    active: 'badge-green',
    expired: 'badge-orange',
    completed: 'badge-blue',
    cancelled: 'badge-red',
  };

  constructor(
    private prescriptionService: PrescriptionService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.loadPrescriptions();
  }

  loadPrescriptions(): void {
    this.prescriptionService.getAll(1, 100).subscribe({
      next: (res) => {
        this.prescriptionsList = res.data || [];
        this.filteredPrescriptions = [...this.prescriptionsList];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching prescriptions:', err);
        this.toastService.show('Failed to load prescriptions list', 'error');
      },
    });
  }

  searchPrescriptions(): void {
    if (!this.search.trim()) {
      this.filteredPrescriptions = [...this.prescriptionsList];
    } else {
      const value = this.search.toLowerCase();
      this.filteredPrescriptions = this.prescriptionsList.filter(
        (p) =>
          p.prescriptionNumber?.toLowerCase().includes(value) ||
          p.patientName?.toLowerCase().includes(value) ||
          p.patientPhone?.toLowerCase().includes(value) ||
          p.doctorName?.toLowerCase().includes(value) ||
          p.doctorSpecialization?.toLowerCase().includes(value) ||
          p.diagnosis?.toLowerCase().includes(value) ||
          p.chiefComplaints?.toLowerCase().includes(value) ||
          p.status?.toLowerCase().includes(value),
      );
    }
    this.cdr.detectChanges();
  }

  getStatusBadge(status: string): string {
    return this.statusColors[status] || 'badge-gray';
  }

  getInitials(name: string): string {
    if (!name || name.trim() === '') return '?';
    const parts = name.trim().split(' ').filter((p) => p.length > 0);
    if (parts.length === 0) return '?';
    if (parts.length === 1) {
      const first = parts[0];
      return first.length >= 2
        ? first.substring(0, 2).toUpperCase()
        : (first + '?').toUpperCase();
    }
    const firstInitial = parts[0][0] || '';
    const lastInitial = parts[parts.length - 1][0] || '';
    return (firstInitial + lastInitial).toUpperCase();
  }

  getMedicineCount(p: Prescription): number {
    return p.medicines?.length || 0;
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  deletePrescription(id: string): void {
    if (!confirm('Are you sure you want to delete this prescription?')) return;

    this.prescriptionService.delete(id).subscribe({
      next: (res) => {
        this.toastService.show(res.message || 'Prescription deleted successfully', 'success');
        this.prescriptionsList = this.prescriptionsList.filter((p) => p.id !== id);
        this.filteredPrescriptions = this.filteredPrescriptions.filter((p) => p.id !== id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting prescription:', err);
        this.toastService.show(err.error?.message || 'Failed to delete prescription', 'error');
      },
    });
  }

 editPrescription(id: string): void {
  this.router.navigate(['/doctor/prescription-form', id]);
}

  // viewPrescription(id: string): void {
  //   this.router.navigate(['/admin/prescription-details'], { queryParams: { id } });
  // }

  // ✅ Table navigation methods
  private getRecordFromRow(rowEl: HTMLElement): Prescription | null {
    const index = rowEl.getAttribute('data-index');
    if (index !== null) {
      const idx = parseInt(index, 10);
      return this.filteredPrescriptions[idx] || null;
    }

    const tbody = rowEl.parentElement;
    if (tbody) {
      const rows = Array.from(tbody.children);
      const rowIndex = rows.indexOf(rowEl);
      if (rowIndex >= 0 && rowIndex < this.filteredPrescriptions.length) {
        return this.filteredPrescriptions[rowIndex];
      }
    }
    return null;
  }

  onUpdate = (rowEl: HTMLElement): void => {
    const record = this.getRecordFromRow(rowEl);
    if (record) this.editPrescription(record.id);
  };

  onDelete = (rowEl: HTMLElement): void => {
    const record = this.getRecordFromRow(rowEl);
    if (record) this.deletePrescription(record.id);
  };
}