import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ToastService } from '../../Services/toastService';
import { Doctor, DoctorService } from '../doctor-service';
import { TableNavigationDirective } from '../../Directives/TableNavigation';

@Component({
  selector: 'app-doctors-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink,TableNavigationDirective],
  templateUrl: './doctors-list.html',
  styleUrl: './doctors-list.css',
})
export class DoctorsList implements OnInit {
  search: string = '';
  doctorsList: Doctor[] = [];
  filteredDoctors: Doctor[] = [];
  updatingStatus: { [key: string]: boolean } = {};

  // ✅ Specialization color mapping
  specializationColors: { [key: string]: string } = {
    Cardiology: 'badge-red',
    Neurology: 'badge-blue',
    Orthopedics: 'badge-green',
    Pediatrics: 'badge-yellow',
    Dermatology: 'badge-purple',
    Gynecology: 'badge-pink',
    Ophthalmology: 'badge-teal',
    ENT: 'badge-orange',
    Psychiatry: 'badge-indigo',
    Radiology: 'badge-cyan',
    Pathology: 'badge-gray',
    Anesthesiology: 'badge-violet',
    Urology: 'badge-rose',
    Nephrology: 'badge-emerald',
    Gastroenterology: 'badge-amber',
    Pulmonology: 'badge-sky',
    Rheumatology: 'badge-fuchsia',
    Oncology: 'badge-crimson',
    Endocrinology: 'badge-lime',
    Hematology: 'badge-maroon',
    'Infectious Disease': 'badge-olive',
    'Internal Medicine': 'badge-navy',
    'Family Medicine': 'badge-teal',
    'Emergency Medicine': 'badge-orange',
  };

  constructor(
    private doctorService: DoctorService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.loadDoctors();
  }

  loadDoctors(): void {
    this.doctorService.getAll().subscribe({
      next: (res) => {
        this.doctorsList = res;
        this.filteredDoctors = [...this.doctorsList];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching doctors:', err);
        this.toastService.show('Failed to load doctors list', 'error');
      },
    });
  }

  searchDoctors(): void {
    if (!this.search.trim()) {
      this.filteredDoctors = [...this.doctorsList];
    } else {
      const value = this.search.toLowerCase();
      this.filteredDoctors = this.doctorsList.filter(
        (d) =>
          d.name?.toLowerCase().includes(value) ||
          d.specialization?.toLowerCase().includes(value) ||
          d.qualification?.toLowerCase().includes(value) ||
          d.email?.toLowerCase().includes(value) ||
          d.phone?.toLowerCase().includes(value) ||
          d.user?.email?.toLowerCase().includes(value) ||
          d.user?.phoneNumber?.toLowerCase().includes(value) ||
          d.consultationFee?.toString().includes(value)
      );
    }
    this.cdr.detectChanges();
  }

  getSpecializationBadge(specialization: string): string {
    return this.specializationColors[specialization] || 'badge-gray';
  }

  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  deleteDoctor(id: string): void {
    if (!confirm('Are you sure you want to delete this doctor?')) return;

    this.doctorService.delete(id).subscribe({
      next: (res) => {
        this.toastService.show(res.message || 'Doctor deleted successfully', 'success');
        this.doctorsList = this.doctorsList.filter((d) => d.id !== id);
        this.filteredDoctors = this.filteredDoctors.filter((d) => d.id !== id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting doctor:', err);
        this.toastService.show(err.error?.message || 'Failed to delete doctor', 'error');
      },
    });
  }

  editDoctor(id: string): void {
    this.router.navigate(['/admin/doctors'], { queryParams: { id } });
  }

  // viewDoctor(id: string): void {
  //   this.router.navigate(['/admin/doctor-details'], { queryParams: { id } });
  // }

  toggleStatus(id: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const newStatus = checkbox.checked;

    this.updatingStatus[id] = true;
    this.cdr.detectChanges();

    this.doctorService.update(id, { isActive: newStatus }).subscribe({
      next: (updatedDoctor) => {
        const index = this.doctorsList.findIndex((d) => d.id === id);
        if (index !== -1) {
          this.doctorsList[index] = { ...this.doctorsList[index], ...updatedDoctor };
        }

        const filteredIndex = this.filteredDoctors.findIndex((d) => d.id === id);
        if (filteredIndex !== -1) {
          this.filteredDoctors[filteredIndex] = { ...this.filteredDoctors[filteredIndex], ...updatedDoctor };
        }

        this.toastService.show(`Doctor ${newStatus ? 'activated' : 'deactivated'} successfully`, 'success');
        this.updatingStatus[id] = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating status:', err);
        this.toastService.show(err.error?.message || 'Failed to update status', 'error');
        this.updatingStatus[id] = false;
        this.cdr.detectChanges();
        this.loadDoctors(); // Reload to revert checkbox
      },
    });
  }

  getStatusClass(status: boolean): string {
    return status ? 'badge-status--active' : 'badge-status--inactive';
  }

  // ✅ Table navigation methods
  private getRecordFromRow(rowEl: HTMLElement): Doctor | null {
    const index = rowEl.getAttribute('data-index');
    if (index !== null) {
      const idx = parseInt(index, 10);
      return this.filteredDoctors[idx] || null;
    }

    const tbody = rowEl.parentElement;
    if (tbody) {
      const rows = Array.from(tbody.children);
      const rowIndex = rows.indexOf(rowEl);
      if (rowIndex >= 0 && rowIndex < this.filteredDoctors.length) {
        return this.filteredDoctors[rowIndex];
      }
    }
    return null;
  }

  onUpdate = (rowEl: HTMLElement): void => {
    const record = this.getRecordFromRow(rowEl);
    if (record) {
      this.editDoctor(record.id);
    }
  };

  onDelete = (rowEl: HTMLElement): void => {
    const record = this.getRecordFromRow(rowEl);
    if (record) {
      this.deleteDoctor(record.id);
    }
  };

  // onDetails = (rowEl: HTMLElement): void => {
  //   const record = this.getRecordFromRow(rowEl);
  //   if (record) {
  //     this.viewDoctor(record.id);
  //   }
  // };
}