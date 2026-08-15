import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { TableNavigationDirective } from '../../Directives/TableNavigation';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Hospital } from '../../Interfaces/hospital.interface';
import { HospitalService } from '../hospital';
import { ToastService } from '../../Services/toastService';

@Component({
  selector: 'app-hospitals-list',
  imports: [RouterLink, FormsModule, TableNavigationDirective],
  templateUrl: './hospitals-list.html',
  styleUrl: './hospitals-list.css',
})
export class HospitalsList implements OnInit {
  search: string = '';
  hospitalsList: Hospital[] = [];
  filteredHospitals: Hospital[] = [];
  updatingStatus: { [key: string]: boolean } = {};

  constructor(
    private hospitalService: HospitalService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.loadHospitals();
  }

  loadHospitals(): void {
    this.hospitalService.getAll().subscribe({
      next: (res) => {
        this.hospitalsList = res;
        this.filteredHospitals = [...this.hospitalsList];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching hospitals:', err);
        this.toastService.show('Failed to load hospitals list', 'error');
      },
    });
  }

 searchHospitals(): void {
  if (!this.search.trim()) {
    this.filteredHospitals = [...this.hospitalsList];
  } else {
    const value = this.search.toLowerCase();
    this.filteredHospitals = this.hospitalsList.filter(
      (h) =>
        h.hospitalName?.toLowerCase().includes(value) ||
        h.adminName?.toLowerCase().includes(value) ||
        h.user?.email?.toLowerCase().includes(value) ||
        h.adminEmail?.toLowerCase().includes(value) ||
        h.contactPhone?.toLowerCase().includes(value) ||
        h.user?.phoneNumber?.toLowerCase().includes(value) ||
        h.plan?.toLowerCase().includes(value) ||
        h.status?.toLowerCase().includes(value) ||
        // ✅ Add opening hours to search
        h.openingTime?.toLowerCase().includes(value) ||
        h.closingTime?.toLowerCase().includes(value) ||
        (h.is24Hours && '24/7'.includes(value)) ||
        h.workingDays?.some(day => day.toLowerCase().includes(value))
    );
  }
  this.cdr.detectChanges();
}

  updateStatus(id: string, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newStatus = select.value as 'pending' | 'active' | 'suspended';
    
    const hospital = this.hospitalsList.find(h => h.id === id);
    if (!hospital || hospital.status === newStatus) {
      return;
    }

    this.updatingStatus[id] = true;
    this.cdr.detectChanges();

    this.hospitalService.update(id, { status: newStatus }).subscribe({
      next: (updatedHospital) => {
        const index = this.hospitalsList.findIndex(h => h.id === id);
        if (index !== -1) {
          this.hospitalsList[index] = { ...this.hospitalsList[index], ...updatedHospital };
        }
        
        const filteredIndex = this.filteredHospitals.findIndex(h => h.id === id);
        if (filteredIndex !== -1) {
          this.filteredHospitals[filteredIndex] = { ...this.filteredHospitals[filteredIndex], ...updatedHospital };
        }

        this.toastService.show(`Status updated to ${newStatus.toUpperCase()} successfully`, 'success');
        this.updatingStatus[id] = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating status:', err);
        const errorMessage = err.error?.message || 'Failed to update status';
        this.toastService.show(errorMessage, 'error');
        
        const selectElement = event.target as HTMLSelectElement;
        if (hospital) {
          selectElement.value = hospital.status;
        }
        this.updatingStatus[id] = false;
        this.cdr.detectChanges();
      },
    });
  }

  deleteHospital(id: string): void {
    if (!confirm('Are you sure you want to delete this hospital?')) return;

    this.hospitalService.softDelete(id).subscribe({
      next: (res) => {
        this.toastService.show(res.message || 'Hospital deleted successfully', 'success');
        this.hospitalsList = this.hospitalsList.filter((h) => h.id !== id);
        this.filteredHospitals = this.filteredHospitals.filter((h) => h.id !== id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting hospital:', err);
        const errorMessage = err.error?.message || 'Failed to delete hospital';
        this.toastService.show(errorMessage, 'error');
      },
    });
  }

  private getRecordFromRow(rowEl: HTMLElement): Hospital | null {
    const index = rowEl.getAttribute('data-index');
    if (index !== null) {
      const idx = parseInt(index, 10);
      return this.filteredHospitals[idx] || null;
    }
    
    const tbody = rowEl.parentElement;
    if (tbody) {
      const rows = Array.from(tbody.children);
      const rowIndex = rows.indexOf(rowEl);
      if (rowIndex >= 0 && rowIndex < this.filteredHospitals.length) {
        return this.filteredHospitals[rowIndex];
      }
    }
    return null;
  }

  onUpdate = (rowEl: HTMLElement): void => {
    const record = this.getRecordFromRow(rowEl);
    if (record) {
      this.router.navigate(['/admin/register'], { queryParams: { id: record.id } });
    }
  };

  onDelete = (rowEl: HTMLElement): void => {
    const record = this.getRecordFromRow(rowEl);
    if (record) {
      this.deleteHospital(record.id);
    }
  };

  onDetails = (rowEl: HTMLElement): void => {
    const record = this.getRecordFromRow(rowEl);
    if (record) {
      this.router.navigate(['/admin/hospital-details'], { queryParams: { id: record.id } });
    }
  };
}