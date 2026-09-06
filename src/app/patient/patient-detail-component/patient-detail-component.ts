// src/app/patient/patient-detail.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { ToastService } from '../../Services/toastService';
import { Patient, PatientService } from '../patient';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './patient-detail-component.html',
  styleUrl: './patient-detail-component.css',
})
export class PatientDetailComponent implements OnInit, OnDestroy {
  patient: Patient | null = null;
  isLoading = true;
  notFound = false;
  private destroy$ = new Subject<void>();

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
    private route: ActivatedRoute,
    private router: Router,
    private patientService: PatientService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.loadPatient(id);
      } else {
        this.notFound = true;
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPatient(id: string): void {
    this.isLoading = true;
    this.patientService.getById(id).subscribe({
      next: (res) => {
        this.patient = res;
        this.isLoading = false;
        this.notFound = false;
      },
      error: (err) => {
        console.error('Error loading patient:', err);
        this.isLoading = false;
        this.notFound = true;
        this.toastService.show('Patient not found', 'error');
      },
    });
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

  getRiskBadge(value: boolean): string {
    return value ? 'Yes' : 'No';
  }

  getRiskClass(value: boolean): string {
    return value ? 'risk-positive' : 'risk-negative';
  }

  editPatient(): void {
    if (this.patient) {
      this.router.navigate(['/admin/patient-form'], { queryParams: { id: this.patient.id } });
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/patients-list']);
  }

  deletePatient(): void {
    if (!this.patient) return;
    if (!confirm(`Are you sure you want to delete patient "${this.patient.name}"?`)) return;

    this.patientService.delete(this.patient.id).subscribe({
      next: (res) => {
        this.toastService.show(res.message || 'Patient deleted successfully', 'success');
        this.goBack();
      },
      error: (err) => {
        console.error('Error deleting patient:', err);
        this.toastService.show(err.error?.message || 'Failed to delete patient', 'error');
      },
    });
  }

  getRiskFactors(): { label: string; value: boolean }[] {
    if (!this.patient) return [];
    return [
      { label: 'Diabetes (DM)', value: this.patient.hasDiabetes || false },
      { label: 'Hypertension (HTN)', value: this.patient.hasHypertension || false },
      { label: 'Heart Disease (IHD)', value: this.patient.hasHeartDisease || false },
      { label: 'Smoker', value: this.patient.isSmoker || false },
      { label: 'Obese', value: this.patient.isObese || false },
    ];
  }

  getSocialHistory(): { label: string; value: any }[] {
    if (!this.patient) return [];
    return [
      { label: 'Smoking', value: this.patient.socialHistory?.smoking ? 'Yes' : 'No' },
      { label: 'Obesity', value: this.patient.socialHistory?.obesity ? 'Yes' : 'No' },
      { label: 'Alcohol', value: this.patient.socialHistory?.alcohol ? 'Yes' : 'No' },
      { label: 'Occupation', value: this.patient.socialHistory?.occupation || 'N/A' },
    ];
  }

  formatList(items: string[] | undefined): string {
    if (!items || items.length === 0) return 'None';
    return items.join(', ');
  }
}