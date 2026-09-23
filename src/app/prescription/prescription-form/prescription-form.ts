// src/app/prescription/prescription-form/prescription-form.ts
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth-service';
import { Patient, PatientService } from '../../patient/patient';
import { CreatePrescriptionDto, Medicine, PrescriptionService } from '../prescription';
import { ToastService } from '../../Services/toastService';
import { Subject } from 'rxjs';
import { TableNavigationDirective } from '../../Directives/TableNavigation';

interface MedicineRow {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  timing: string;
  instructions: string;
  notes: string;
}

@Component({
  selector: 'app-prescription-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TableNavigationDirective],
  templateUrl: './prescription-form.html',
  styleUrls: ['./prescription-form.css'],
})
export class PrescriptionForm implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('dropdownList') dropdownList!: ElementRef;
  @ViewChild('medicineNameInput') medicineNameInput!: ElementRef<HTMLInputElement>;
  @ViewChild('medEntryCard') medEntryCard!: ElementRef<HTMLElement>;

  prescriptionForm: FormGroup;
  medicineEntryForm: FormGroup;

  editId: string | null = null;
  isLoading = false;
  showErrorSummary = false;

  medicinesList: MedicineRow[] = [];
  editingIndex: number | null = null;
  medicineEntryError = '';

  patients: Patient[] = [];
  filteredPatients: Patient[] = [];
  selectedPatient: Patient | null = null;
  selectedPatientId = '';
  patientSearch = '';
  isDropdownOpen = false;
  highlightedIndex = -1;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private prescriptionService: PrescriptionService,
    private patientService: PatientService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {
    this.prescriptionForm = this.fb.group({
      patientId: ['', Validators.required],
      chiefComplaints: ['', Validators.required],
      examination: [''],
      diagnosis: ['', Validators.required],
      advice: [''],
      notes: [''],
      followUpDate: [''],
      followUpNotes: [''],
    });

    this.medicineEntryForm = this.createMedicineForm();
  }

  ngOnInit(): void {
    this.editId = this.route.snapshot.params['id'] || null;
    this.loadPatients();
    if (this.editId) this.loadPrescription(this.editId);
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  ngAfterViewInit(): void {
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('click', this.handleClickOutside.bind(this));
  }

  private createMedicineForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      dosage: ['', Validators.required],
      frequency: ['', Validators.required],
      duration: ['', Validators.required],
      timing: [''],
      instructions: [''],
      notes: [''],
    });
  }

  private makeRowId(): string {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  // ==================== PATIENT SEARCH ====================
  handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const dropdown = document.querySelector('.rx-patient-search');
    if (dropdown && !dropdown.contains(target)) {
      this.isDropdownOpen = false;
      this.cdr.detectChanges();
    }
  }

  loadPatients(): void {
    this.patientService.getAll().subscribe({
      next: (res) => {
        this.patients = res;
        this.filteredPatients = [...res];
        this.cdr.detectChanges();
      },
      error: () => this.toastService.show('Failed to load patients', 'error'),
    });
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      this.patientSearch = '';
      this.filteredPatients = [...this.patients];
      this.highlightedIndex = -1;
      setTimeout(() => {
        (document.querySelector('.rx-dropdown-input') as HTMLInputElement)?.focus();
      }, 80);
    }
    this.cdr.detectChanges();
  }

  onSearchInput(event: Event): void {
    this.patientSearch = (event.target as HTMLInputElement).value;
    this.filterPatients();
    this.highlightedIndex = -1;
  }

  filterPatients(): void {
    const s = this.patientSearch.toLowerCase().trim();
    this.filteredPatients = !s
      ? [...this.patients]
      : this.patients.filter(
          (p) =>
            p.name.toLowerCase().includes(s) ||
            (p.phoneNumber && p.phoneNumber.includes(s)) ||
            (p.cnic && p.cnic.includes(s)),
        );
  }

  selectPatient(patient: Patient): void {
    this.selectedPatient = patient;
    this.selectedPatientId = patient.id;
    this.prescriptionForm.patchValue({ patientId: patient.id });
    this.patientSearch = `${patient.name} (${patient.phoneNumber})`;
    this.isDropdownOpen = false;
    this.cdr.detectChanges();
  }

  getSelectedPatientName(): string {
    if (!this.selectedPatientId) return '';
    const p = this.patients.find((x) => x.id === this.selectedPatientId);
    return p ? `${p.name} (${p.phoneNumber})` : '';
  }

  clearPatient(): void {
    this.selectedPatient = null;
    this.selectedPatientId = '';
    this.patientSearch = '';
    this.prescriptionForm.patchValue({ patientId: '' });
    this.isDropdownOpen = false;
  }

  onDropdownKeydown(event: KeyboardEvent): void {
    const items = this.filteredPatients;
    if (!items.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex = (this.highlightedIndex + 1) % items.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex = (this.highlightedIndex - 1 + items.length) % items.length;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.highlightedIndex >= 0) this.selectPatient(items[this.highlightedIndex]);
    } else if (event.key === 'Escape') {
      this.isDropdownOpen = false;
    }
  }

  // ==================== MEDICINES ====================
  addMedicineToList(): void {
    this.medicineEntryError = '';

    if (this.medicineEntryForm.invalid) {
      this.medicineEntryForm.markAllAsTouched();
      this.medicineEntryError = 'Please fill Name, Dosage, Frequency & Duration.';
      return;
    }

    const v = this.medicineEntryForm.value;

    if (this.editingIndex !== null) {
      this.medicinesList[this.editingIndex] = {
        ...this.medicinesList[this.editingIndex],
        name: v.name.trim(),
        dosage: v.dosage.trim(),
        frequency: v.frequency.trim(),
        duration: v.duration.trim(),
        timing: v.timing || '',
        instructions: v.instructions || '',
        notes: v.notes || '',
      };
      const updatedName = v.name.trim();
      this.editingIndex = null;
      this.toastService.show(`Updated "${updatedName}"`, 'success');
    } else {
      this.medicinesList.push({
        id: this.makeRowId(),
        name: v.name.trim(),
        dosage: v.dosage.trim(),
        frequency: v.frequency.trim(),
        duration: v.duration.trim(),
        timing: v.timing || '',
        instructions: v.instructions || '',
        notes: v.notes || '',
      });
      this.toastService.show('Medicine added', 'success');
    }

    this.resetMedicineEntryForm();
    this.cdr.detectChanges();
  }

  editMedicine(index: number): void {
  console.log('🔵 editMedicine called with index:', index);
  const med = this.medicinesList[index];
  console.log('🔵 med data:', med);
  if (!med) return;
  

    this.medicineEntryForm.patchValue({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: med.duration,
      timing: med.timing || '',
      instructions: med.instructions || '',
      notes: med.notes || '',
    });
    this.editingIndex = index;
    this.medicineEntryError = '';
    this.cdr.detectChanges();

    // Scroll to entry form + focus first input
    setTimeout(() => {
      const entryEl = this.medEntryCard?.nativeElement;
      if (entryEl) {
        entryEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const nameInput =
        this.medicineNameInput?.nativeElement ||
        (document.querySelector('.rx-med-entry input[formcontrolname="name"]') as HTMLInputElement);
      nameInput?.focus();
      nameInput?.select?.();
    }, 80);
  }

  cancelEditMedicine(): void {
    this.editingIndex = null;
    this.medicineEntryError = '';
    this.resetMedicineEntryForm();
    this.cdr.detectChanges();
  }

  deleteMedicine(index: number): void {
    if (index < 0 || index >= this.medicinesList.length) return;
    const removed = this.medicinesList.splice(index, 1)[0];

    if (this.editingIndex === index) {
      this.editingIndex = null;
      this.resetMedicineEntryForm();
    } else if (this.editingIndex !== null && this.editingIndex > index) {
      this.editingIndex--;
    }

    this.toastService.show(`Removed "${removed.name}"`, 'error');
    this.cdr.detectChanges();
  }

  private resetMedicineEntryForm(): void {
    this.medicineEntryForm.reset({
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      timing: '',
      instructions: '',
      notes: '',
    });
  }

  // ==================== TABLE NAVIGATION ====================
  private getMedicineFromRow(rowEl: HTMLElement): { index: number; row: MedicineRow } | null {
    const idxAttr = rowEl.getAttribute('data-index');
    if (idxAttr !== null) {
      const idx = parseInt(idxAttr, 10);
      const row = this.medicinesList[idx];
      if (row) return { index: idx, row };
    }
    const tbody = rowEl.parentElement;
    if (tbody) {
      const rows = Array.from(tbody.children) as HTMLElement[];
      const idx = rows.indexOf(rowEl);
      if (idx >= 0 && idx < this.medicinesList.length) {
        return { index: idx, row: this.medicinesList[idx] };
      }
    }
    return null;
  }

  onUpdateMedicine = (rowEl: HTMLElement): void => {
    const found = this.getMedicineFromRow(rowEl);
    if (!found) return;
    this.editMedicine(found.index);
  };

  onDeleteMedicine = (rowEl: HTMLElement): void => {
    const found = this.getMedicineFromRow(rowEl);
    if (!found) return;
    this.deleteMedicine(found.index);
  };

  // ==================== VALIDATION ====================
  getFormErrors(): string[] {
    const errors: string[] = [];
    const c = this.prescriptionForm.controls;
    if (c['patientId'].invalid) errors.push('Please select a patient.');
    if (c['chiefComplaints'].invalid) errors.push('Chief complaints are required.');
    if (c['diagnosis'].invalid) errors.push('Diagnosis is required.');
    if (this.medicinesList.length === 0)
      errors.push('Add at least one medicine to the list.');
    return errors;
  }

  isFieldInvalid(fieldName: string): boolean {
    const ctrl = this.prescriptionForm.get(fieldName);
    return !!ctrl && ctrl.invalid && ctrl.touched;
  }

  getFieldError(fieldName: string): string {
    const ctrl = this.prescriptionForm.get(fieldName);
    if (!ctrl?.errors) return '';
    return ctrl.errors['required'] ? 'This field is required.' : 'Invalid value.';
  }

  // ==================== LOAD (EDIT) ====================
  loadPrescription(id: string): void {
    this.isLoading = true;
    this.prescriptionService.getById(id).subscribe({
      next: (p) => {
        this.selectedPatient = {
          id: p.patientId,
          name: p.patientName,
          phoneNumber: p.patientPhone,
        } as Patient;
        this.selectedPatientId = p.patientId;

        this.prescriptionForm.patchValue({
          patientId: p.patientId,
          chiefComplaints: p.chiefComplaints,
          examination: p.examination,
          diagnosis: p.diagnosis,
          advice: p.advice,
          notes: p.notes,
          followUpDate: p.followUpDate
            ? new Date(p.followUpDate).toISOString().split('T')[0]
            : '',
          followUpNotes: p.followUpNotes,
        });

        this.patientSearch = `${p.patientName} (${p.patientPhone})`;

        this.medicinesList = (p.medicines || []).map((m: Medicine) => ({
          id: this.makeRowId(),
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          timing: (m as any).timing || '',
          instructions: (m as any).instructions || '',
          notes: (m as any).notes || '',
        }));

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.toastService.show('Error loading prescription', 'error');
      },
    });
  }

  // ==================== RESET ====================
  resetForm(): void {
    if (!confirm('Reset the entire form? All unsaved changes will be lost.')) return;
    this.prescriptionForm.reset();
    this.resetMedicineEntryForm();
    this.medicinesList = [];
    this.editingIndex = null;
    this.selectedPatient = null;
    this.selectedPatientId = '';
    this.patientSearch = '';
    this.showErrorSummary = false;
    this.toastService.show('Form reset', 'success');
  }

  // ==================== SUBMIT ====================
  onSubmit(): void {
    if (this.medicinesList.length === 0) {
      this.showErrorSummary = true;
      this.markAllTouched();
      return;
    }
    if (this.prescriptionForm.invalid) {
      this.showErrorSummary = true;
      this.markAllTouched();
      return;
    }

    this.isLoading = true;
    this.showErrorSummary = false;

    const fv = this.prescriptionForm.value;
    const payload: CreatePrescriptionDto = {
      patientId: fv.patientId,
      chiefComplaints: fv.chiefComplaints,
      examination: fv.examination,
      diagnosis: fv.diagnosis,
      advice: fv.advice,
      notes: fv.notes,
      medicines: this.medicinesList.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        timing: m.timing,
        instructions: m.instructions,
        notes: m.notes,
      })) as any,
      followUpDate: fv.followUpDate || undefined,
      followUpNotes: fv.followUpNotes || undefined,
    };

    const req$ = this.editId
      ? this.prescriptionService.update(this.editId, payload)
      : this.prescriptionService.create(payload);

    req$.subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.show(
          this.editId
            ? '✅ Prescription updated successfully!'
            : '✅ Prescription generated successfully!',
          'success',
        );
        if (!this.editId) {
          this.prescriptionForm.reset();
          this.resetMedicineEntryForm();
          this.medicinesList = [];
          this.selectedPatient = null;
          this.selectedPatientId = '';
          this.patientSearch = '';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Error saving prescription. Please try again.';
        this.toastService.show(`❌ ${msg}`, 'error');
        this.cdr.detectChanges();
      },
    });
  }

  markAllTouched(): void {
    Object.keys(this.prescriptionForm.controls).forEach((k) =>
      this.prescriptionForm.get(k)?.markAsTouched(),
    );
    this.medicineEntryForm.markAllAsTouched();
  }
}