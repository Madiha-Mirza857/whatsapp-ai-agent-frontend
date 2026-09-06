// src/app/patient/patient-form.component.ts
import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, AfterViewInit, ViewChild, HostListener, ChangeDetectorRef, OnDestroy } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, takeUntil } from 'rxjs';

import { ToastService } from '../../Services/toastService';
import { CreatePatientDto, PatientService } from '../patient';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

@Component({
  selector: 'app-patient-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './patient-form.html',
  styleUrl: './patient-form.css',
})
export class PatientForm implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;

  editId: string | null = null;
  showErrorSummary = false;
  patientNotFound = false;
  isLoading = false;

  bloodGroups = BLOOD_GROUPS;
  genders = ['male', 'female', 'other'];

  // Availability checks
  isPhoneChecking = false;
  isCnicChecking = false;
  phoneCheckMessage = '';
  cnicCheckMessage = '';
  phoneAvailable = false;
  cnicAvailable = false;

  private phoneSubject = new Subject<string>();
  private cnicSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  patientForm = new FormGroup({
    // Basic Info
    name: new FormControl('', [Validators.required, Validators.maxLength(150)]),
    phoneNumber: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9+]{10,15}$/),
    ]),
    cnic: new FormControl('', [
      Validators.pattern(/^[0-9-]{13,15}$/),
    ]),
    emergencyContact: new FormControl('', [
      Validators.pattern(/^[0-9+]{10,15}$/),
    ]),

    // Demographics
    dateOfBirth: new FormControl(''),
    age: new FormControl<number | null>(null, [
      Validators.min(0),
      Validators.max(120),
    ]),
    gender: new FormControl(''),
    bloodGroup: new FormControl(''),
    address: new FormControl(''),

    // Medical History
    allergies: new FormControl(''),
    pastSurgeries: new FormControl(''),
    chronicDiseases: new FormControl(''),
    familyHistory: new FormControl(''),
    notes: new FormControl(''),

    // Risk Factors - Quick indicators
    hasDiabetes: new FormControl(false),
    hasHypertension: new FormControl(false),
    hasHeartDisease: new FormControl(false),
    isSmoker: new FormControl(false),
    isObese: new FormControl(false),

    // Social History
    smoking: new FormControl(false),
    obesity: new FormControl(false),
    alcohol: new FormControl(false),
    occupation: new FormControl(''),
  });

  @HostListener('document:click')
  dismissNotFound(): void {
    if (this.patientNotFound) {
      this.patientNotFound = false;
    }
  }

  constructor(
    private patientService: PatientService,
    private router: Router,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.editId = new URLSearchParams(window.location.search).get('id');

    //  Auto-calculate age from DOB
    this.patientForm.get('dateOfBirth')?.valueChanges.subscribe((dob) => {
      if (dob) {
        const age = this.calculateAge(dob);
        this.patientForm.patchValue({ age });
      } else {
        this.patientForm.patchValue({ age: null });
      }
    });

    // Phone validation
    this.phoneSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap((phone) => {
        if (!phone || this.patientForm.get('phoneNumber')?.invalid) {
          this.clearPhoneStatus();
          return of(null);
        }
        this.isPhoneChecking = true;
        return this.patientService.checkPhoneAvailability(phone, this.editId || undefined);
      }),
      takeUntil(this.destroy$),
    ).subscribe((result) => {
      this.isPhoneChecking = false;
      if (result) {
        this.phoneAvailable = result.available;
        this.phoneCheckMessage = result.available ? ' Available' : '❌ Already registered';
        const phoneControl = this.patientForm.get('phoneNumber');
        if (!result.available) {
          phoneControl?.setErrors({ ...phoneControl?.errors, taken: true });
        } else {
          const errors = phoneControl?.errors;
          if (errors) {
            delete errors['taken'];
            if (Object.keys(errors).length === 0) {
              phoneControl?.setErrors(null);
            }
          }
        }
        this.cdr.detectChanges();
      }
    });

    // CNIC validation
    this.cnicSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap((cnic) => {
        if (!cnic || this.patientForm.get('cnic')?.invalid) {
          this.clearCnicStatus();
          return of(null);
        }
        this.isCnicChecking = true;
        return this.patientService.checkCnicAvailability(cnic, this.editId || undefined);
      }),
      takeUntil(this.destroy$),
    ).subscribe((result) => {
      this.isCnicChecking = false;
      if (result) {
        this.cnicAvailable = result.available;
        this.cnicCheckMessage = result.available ? ' Available' : '❌ Already registered';
        const cnicControl = this.patientForm.get('cnic');
        if (!result.available) {
          cnicControl?.setErrors({ ...cnicControl?.errors, taken: true });
        } else {
          const errors = cnicControl?.errors;
          if (errors) {
            delete errors['taken'];
            if (Object.keys(errors).length === 0) {
              cnicControl?.setErrors(null);
            }
          }
        }
        this.cdr.detectChanges();
      }
    });

    if (this.editId) {
      this.loadForEdit();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.nameInput?.nativeElement?.focus(), 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  calculateAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  clearPhoneStatus(): void {
    this.phoneCheckMessage = '';
    this.phoneAvailable = false;
    this.isPhoneChecking = false;
  }

  clearCnicStatus(): void {
    this.cnicCheckMessage = '';
    this.cnicAvailable = false;
    this.isCnicChecking = false;
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.phoneSubject.next(input.value);
  }

  onCnicInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.cnicSubject.next(input.value);
  }

  loadForEdit(): void {
    if (!this.editId) return;

    this.patientNotFound = false;
    this.patientService.getById(this.editId).subscribe({
      next: (res) => {
        this.patientForm.patchValue({
          name: res.name,
          phoneNumber: res.phoneNumber,
          cnic: res.cnic || '',
          emergencyContact: res.emergencyContact || '',
          dateOfBirth: res.dateOfBirth ? new Date(res.dateOfBirth).toISOString().slice(0, 10) : '',
          age: res.age || null,
          gender: res.gender || '',
          bloodGroup: res.bloodGroup || '',
          address: res.address || '',
          allergies: res.allergies ? res.allergies.join(', ') : '',
          pastSurgeries: res.pastSurgeries ? res.pastSurgeries.join(', ') : '',
          chronicDiseases: res.chronicDiseases ? res.chronicDiseases.join(', ') : '',
          familyHistory: res.familyHistory || '',
          notes: res.notes || '',
          hasDiabetes: res.hasDiabetes || false,
          hasHypertension: res.hasHypertension || false,
          hasHeartDisease: res.hasHeartDisease || false,
          isSmoker: res.isSmoker || false,
          isObese: res.isObese || false,
          smoking: res.socialHistory?.smoking || false,
          obesity: res.socialHistory?.obesity || false,
          alcohol: res.socialHistory?.alcohol || false,
          occupation: res.socialHistory?.occupation || '',
        });
        this.focusName();
      },
      error: () => {
        this.patientNotFound = true;
        this.editId = null;
        this.patientForm.reset();
      },
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.patientForm.get(fieldName);
    if (field?.errors && field.errors['taken']) {
      return true;
    }
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.patientForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['taken']) {
        if (fieldName === 'phoneNumber') {
          return '❌ This phone number is already registered.';
        }
        if (fieldName === 'cnic') {
          return '❌ This CNIC is already registered.';
        }
      }
      if (field.errors['required']) return 'This field is required';
      if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} characters required`;
      if (field.errors['maxlength']) return `Maximum ${field.errors['maxlength'].requiredLength} characters`;
      if (field.errors['min']) return `Minimum value is ${field.errors['min'].min}`;
      if (field.errors['max']) return `Maximum value is ${field.errors['max'].max}`;
      if (field.errors['pattern']) {
        if (fieldName === 'phoneNumber' || fieldName === 'emergencyContact') {
          return 'Invalid format (10-15 digits, e.g., 03001234567)';
        }
        if (fieldName === 'cnic') {
          return 'Invalid CNIC format (e.g., 12345-1234567-1)';
        }
        return 'Invalid format';
      }
    }
    return '';
  }

  getFormErrors(): string[] {
    const errors: string[] = [];
    const controls = this.patientForm.controls;

    if (controls.name.invalid) errors.push('Patient Name is required');
    if (controls.phoneNumber.invalid) {
      if (controls.phoneNumber.errors?.['taken']) {
        errors.push('This phone number is already registered.');
      } else {
        errors.push('Valid Phone Number is required (10-15 digits)');
      }
    }
    if (controls.cnic.invalid && controls.cnic.errors?.['taken']) {
      errors.push('This CNIC is already registered.');
    }

    return errors;
  }

  focusName(): void {
    setTimeout(() => this.nameInput?.nativeElement?.focus(), 0);
  }

  onSubmit(): void {
    this.patientForm.markAllAsTouched();

    if (this.patientForm.get('phoneNumber')?.errors?.['taken']) {
      this.showErrorSummary = true;
      this.toastService.show('❌ This phone number is already registered.', 'error');
      return;
    }

    if (this.patientForm.get('cnic')?.errors?.['taken']) {
      this.showErrorSummary = true;
      this.toastService.show('❌ This CNIC is already registered.', 'error');
      return;
    }

    if (this.patientForm.invalid) {
      this.showErrorSummary = true;
      this.toastService.show('Please fix all errors before submitting', 'error');
      return;
    }

    this.showErrorSummary = false;
    const formData = this.patientForm.value;

    const parseList = (value: string | null | undefined): string[] => {
      if (!value) return [];
      return value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    };

    const payload: CreatePatientDto = {
      name: formData.name!,
      phoneNumber: formData.phoneNumber!,
      cnic: formData.cnic || undefined,
      emergencyContact: formData.emergencyContact || undefined,
      dateOfBirth: formData.dateOfBirth || undefined,
      age: formData.age || undefined,
      gender: formData.gender || undefined,
      bloodGroup: formData.bloodGroup || undefined,
      address: formData.address || undefined,
      notes: formData.notes || undefined,
      allergies: parseList(formData.allergies),
      pastSurgeries: parseList(formData.pastSurgeries),
      chronicDiseases: parseList(formData.chronicDiseases),
      familyHistory: formData.familyHistory || undefined,
     socialHistory: {
    smoking: !!formData.smoking,
    obesity: !!formData.obesity,
    alcohol: !!formData.alcohol,
    occupation: formData.occupation || '',
  },
        hasDiabetes: !!formData.hasDiabetes,
  hasHypertension: !!formData.hasHypertension,
  hasHeartDisease: !!formData.hasHeartDisease,
  isSmoker: !!formData.isSmoker,
  isObese: !!formData.isObese,
  
    };

    this.isLoading = true;

    if (this.editId) {
      this.patientService.update(this.editId, payload).subscribe({
        next: () => {
          this.toastService.show(' Patient Updated Successfully!', 'success');
          this.resetForm();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error updating patient:', err);
          this.toastService.show(err.error?.message || 'Failed to update patient', 'error');
          this.showErrorSummary = true;
          this.isLoading = false;
        },
      });
    } else {
      this.patientService.create(payload).subscribe({
        next: () => {
          this.toastService.show(' Patient Added Successfully!', 'success');
          this.resetForm();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error creating patient:', err);
          this.toastService.show(err.error?.message || 'Failed to create patient', 'error');
          this.showErrorSummary = true;
          this.isLoading = false;
        },
      });
    }
  }

  resetForm(): void {
    this.patientForm.reset({
      name: '',
      phoneNumber: '',
      cnic: '',
      emergencyContact: '',
      dateOfBirth: '',
      age: null,
      gender: '',
      bloodGroup: '',
      address: '',
      allergies: '',
      pastSurgeries: '',
      chronicDiseases: '',
      familyHistory: '',
      notes: '',
      hasDiabetes: false,
      hasHypertension: false,
      hasHeartDisease: false,
      isSmoker: false,
      isObese: false,
      smoking: false,
      obesity: false,
      alcohol: false,
      occupation: '',
    });
    this.editId = null;
    this.patientNotFound = false;
    this.showErrorSummary = false;
    this.clearPhoneStatus();
    this.clearCnicStatus();
    this.focusName();
  }

  goBack(): void {
    this.router.navigate(['/admin/patients-list']);
  }
}