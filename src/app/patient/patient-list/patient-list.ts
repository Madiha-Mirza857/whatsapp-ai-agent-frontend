// src/app/patient/patient-list.component.ts
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ToastService } from '../../Services/toastService';
import { TableNavigationDirective } from '../../Directives/TableNavigation';
import { Patient, PatientService } from '../patient';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TableNavigationDirective],
  templateUrl: './patient-list.html',
  styleUrl: './patient-list.css',
})
export class PatientList implements OnInit {
  search: string = '';
  patientsList: Patient[] = [];
  filteredPatients: Patient[] = [];
  updatingStatus: { [key: string]: boolean } = {};

  // Blood group color mapping
  bloodGroupColors: { [key: string]: string } = {
    'A+': 'badge-red',
    'A-': 'badge-pink',
    'B+': 'badge-blue',
    'B-': 'badge-indigo',
    'AB+': 'badge-purple',
    'AB-': 'badge-violet',
    'O+': 'badge-green',
    'O-': 'badge-teal',
  };

  constructor(
    private patientService: PatientService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.patientService.getAll().subscribe({
      next: (res) => {
        this.patientsList = res;
        this.filteredPatients = [...this.patientsList];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching patients:', err);
        this.toastService.show('Failed to load patients list', 'error');
      },
    });
  }

  searchPatients(): void {
    if (!this.search.trim()) {
      this.filteredPatients = [...this.patientsList];
    } else {
      const value = this.search.toLowerCase();
      this.filteredPatients = this.patientsList.filter(
        (p) =>
          p.name?.toLowerCase().includes(value) ||
          p.phoneNumber?.toLowerCase().includes(value) ||
          p.cnic?.toLowerCase().includes(value) ||
          p.address?.toLowerCase().includes(value) ||
          p.bloodGroup?.toLowerCase().includes(value)
      );
    }
    this.cdr.detectChanges();
  }

  getBloodGroupBadge(bloodGroup: string): string {
    return this.bloodGroupColors[bloodGroup] || 'badge-gray';
  }

getInitials(name: string): string {
  if (!name || name.trim() === '') return '?';
  
  const trimmedName = name.trim();
  const parts = trimmedName.split(' ');
  const filteredParts = parts.filter(part => part.length > 0);
  
  if (filteredParts.length === 0) return '?';
  if (filteredParts.length === 1) {
    const firstPart = filteredParts[0];
    return firstPart.length >= 2 
      ? firstPart.substring(0, 2).toUpperCase() 
      : (firstPart + '?').toUpperCase();
  }
  
  const firstInitial = filteredParts[0][0] || '';
  const lastInitial = filteredParts[filteredParts.length - 1][0] || '';
  return (firstInitial + lastInitial).toUpperCase();
}

  deletePatient(id: string): void {
    if (!confirm('Are you sure you want to delete this patient?')) return;

    this.patientService.delete(id).subscribe({
      next: (res) => {
        this.toastService.show(res.message || 'Patient deleted successfully', 'success');
        this.patientsList = this.patientsList.filter((p) => p.id !== id);
        this.filteredPatients = this.filteredPatients.filter((p) => p.id !== id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting patient:', err);
        this.toastService.show(err.error?.message || 'Failed to delete patient', 'error');
      },
    });
  }

  editPatient(id: string): void {
    this.router.navigate(['/admin/patient-form'], { queryParams: { id } });
  }

  viewPatient(id: string): void {
    this.router.navigate(['/admin/patient-detail'], { queryParams: { id } });
  }

  getRiskBadge(value: boolean): string {
    return value ? '🔴 Yes' : ' No';
  }

  // ✅ Table navigation methods
  private getRecordFromRow(rowEl: HTMLElement): Patient | null {
    const index = rowEl.getAttribute('data-index');
    if (index !== null) {
      const idx = parseInt(index, 10);
      return this.filteredPatients[idx] || null;
    }
    return null;
  }

  onUpdate = (rowEl: HTMLElement): void => {
    const record = this.getRecordFromRow(rowEl);
    if (record) {
      this.editPatient(record.id);
    }
  };

  onDelete = (rowEl: HTMLElement): void => {
    const record = this.getRecordFromRow(rowEl);
    if (record) {
      this.deletePatient(record.id);
    }
  };

  onDetails = (rowEl: HTMLElement): void => {
    const record = this.getRecordFromRow(rowEl);
    if (record) {
      this.viewPatient(record.id);
    }
  };
}