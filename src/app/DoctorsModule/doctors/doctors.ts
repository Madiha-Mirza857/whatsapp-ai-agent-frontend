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
import { Doctor, DoctorService } from '../doctor-service';
import { ToastService } from '../../Services/toastService';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, takeUntil } from 'rxjs';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormsModule],
  templateUrl: './doctors.html',
  styleUrl: './doctors.css',
})
export class Doctors implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') passwordInput!: ElementRef<HTMLInputElement>;

  editId: string | null = null;
  showErrorSummary = false;
  doctorNotFound = false;
  isLoading = false;
  doctorsList: Doctor[] = [];
  filteredDoctors: Doctor[] = [];
  searchTerm: string = '';

  // Searchable dropdown properties
  isDropdownOpen = false;
  specializationSearch: string = '';
  filteredSpecializations: string[] = [];
  selectedSpecialization: string = '';
  highlightedIndex: number = -1;
  searchInputValue: string = '';
  showCustomSpecialization = false;

  // Email/Phone availability check
  isEmailChecking = false;
  isPhoneChecking = false;
  emailCheckMessage = '';
  phoneCheckMessage = '';
  emailAvailable = false;
  phoneAvailable = false;
  
  // Debounce subjects
  private emailSubject = new Subject<string>();
  private phoneSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // All specializations
  allSpecializations = [
    'Cardiology',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Dermatology',
    'Gynecology',
    'Ophthalmology',
    'ENT',
    'Psychiatry',
    'Radiology',
    'Pathology',
    'Anesthesiology',
    'Urology',
    'Nephrology',
    'Gastroenterology',
    'Pulmonology',
    'Rheumatology',
    'Oncology',
    'Endocrinology',
    'Hematology',
    'Infectious Disease',
    'Internal Medicine',
    'Family Medicine',
    'Emergency Medicine',
    'Other'
  ];

  // Custom validator for unique email/phone
  uniqueValidator = (control: AbstractControl): ValidationErrors | null => {
    if (control.value && control.errors) {
      if (control.errors['taken']) {
        return { taken: true };
      }
    }
    return null;
  };

  doctorForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(150)]),
    specialization: new FormControl('', [Validators.required]),
    customSpecialization: new FormControl(''),
    qualification: new FormControl('', [Validators.required, Validators.maxLength(255)]),
    experienceYears: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(60),
    ]),
    consultationFee: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
    ]),
    email: new FormControl('', [
      Validators.required,
      Validators.email,
      Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    ]),
    phone: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9+]{10,15}$/)
    ]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)]),
    isActive: new FormControl(true),
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const dropdown = document.querySelector('.searchable-dropdown');
    if (dropdown && !dropdown.contains(target)) {
      this.isDropdownOpen = false;
    }
  }

  constructor(
    private doctorService: DoctorService,
    private router: Router,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.editId = new URLSearchParams(window.location.search).get('id');
    this.filteredSpecializations = [...this.allSpecializations];

    // Watch for specialization changes
    this.doctorForm.get('specialization')?.valueChanges.subscribe((value) => {
      this.showCustomSpecialization = value === 'Other';
      if (!this.showCustomSpecialization) {
        this.doctorForm.get('customSpecialization')?.setValue('');
      }
    });

    // Setup debounced email validation
    this.emailSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap((email) => {
        if (!email || this.doctorForm.get('email')?.invalid) {
          this.clearEmailStatus();
          return of(null);
        }
        this.isEmailChecking = true;
        return this.doctorService.checkEmailAvailability(email, this.editId || undefined);
      }),
      takeUntil(this.destroy$)
    ).subscribe((result) => {
      this.isEmailChecking = false;
      if (result) {
        this.emailAvailable = result.available;
        this.emailCheckMessage = result.message;
        
        const emailControl = this.doctorForm.get('email');
        if (!result.available) {
          emailControl?.setErrors({ ...emailControl?.errors, taken: true });
        } else {
          const errors = emailControl?.errors;
          if (errors) {
            delete errors['taken'];
            if (Object.keys(errors).length === 0) {
              emailControl?.setErrors(null);
            }
          }
        }
        this.cdr.detectChanges();
      }
    });

    // Setup debounced phone validation
    this.phoneSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap((phone) => {
        if (!phone || this.doctorForm.get('phone')?.invalid) {
          this.clearPhoneStatus();
          return of(null);
        }
        this.isPhoneChecking = true;
        return this.doctorService.checkPhoneAvailability(phone, this.editId || undefined);
      }),
      takeUntil(this.destroy$)
    ).subscribe((result) => {
      this.isPhoneChecking = false;
      if (result) {
        this.phoneAvailable = result.available;
        this.phoneCheckMessage = result.message;
        
        const phoneControl = this.doctorForm.get('phone');
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

    // Load doctors if editing
    if (this.editId) {
      this.loadForEdit();
    } else {
      this.doctorForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
      this.doctorForm.get('password')?.updateValueAndValidity();
    }

    // Load doctors list
    this.loadDoctors();
  }

  ngAfterViewInit(): void {
    this.focusName();
    setTimeout(() => {
      const passwordControl = this.doctorForm.get('password');
      if (passwordControl?.value) {
        passwordControl.markAsUntouched();
        passwordControl.markAsPristine();
      }
    }, 500);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  clearEmailStatus(): void {
    this.emailCheckMessage = '';
    this.emailAvailable = false;
    this.isEmailChecking = false;
  }

  clearPhoneStatus(): void {
    this.phoneCheckMessage = '';
    this.phoneAvailable = false;
    this.isPhoneChecking = false;
  }

  // Trigger email check on input
  onEmailInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.emailSubject.next(input.value);
  }

  // Trigger phone check on input
  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.phoneSubject.next(input.value);
  }

  focusName(): void {
    setTimeout(() => this.nameInput?.nativeElement?.focus(), 0);
  }

  // Dropdown methods
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchInputValue = input.value;
    this.filterSpecializations(input.value);
    this.highlightedIndex = -1;
  }

  filterSpecializations(search: string = this.searchInputValue): void {
    const searchTerm = search.toLowerCase().trim();
    if (!searchTerm) {
      this.filteredSpecializations = [...this.allSpecializations];
    } else {
      this.filteredSpecializations = this.allSpecializations.filter(
        (spec) => spec.toLowerCase().includes(searchTerm)
      );
    }
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      this.searchInputValue = '';
      this.highlightedIndex = -1;
      this.filteredSpecializations = [...this.allSpecializations];
      setTimeout(() => this.searchInput?.nativeElement?.focus(), 100);
    }
  }

  onDropdownKeydown(event: KeyboardEvent): void {
    const list = document.querySelector('.dropdown-list');
    if (!list) return;

    const items = list.querySelectorAll('.dropdown-item');
    if (items.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex = (this.highlightedIndex + 1) % items.length;
      this.scrollToHighlighted(items);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex = (this.highlightedIndex - 1 + items.length) % items.length;
      this.scrollToHighlighted(items);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.highlightedIndex >= 0 && this.highlightedIndex < items.length) {
        const selectedSpec = this.filteredSpecializations[this.highlightedIndex];
        if (selectedSpec) {
          this.selectSpecialization(selectedSpec);
        }
      }
    } else if (event.key === 'Escape') {
      this.isDropdownOpen = false;
    }
  }

  scrollToHighlighted(items: NodeListOf<Element>): void {
    const highlightedItem = items[this.highlightedIndex] as HTMLElement;
    if (highlightedItem) {
      highlightedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  selectSpecialization(spec: string): void {
    this.selectedSpecialization = spec;
    this.doctorForm.patchValue({ specialization: spec });
    this.searchInputValue = spec;
    this.isDropdownOpen = false;
    this.highlightedIndex = -1;
    
    this.showCustomSpecialization = spec === 'Other';
    if (spec !== 'Other') {
      this.doctorForm.get('customSpecialization')?.setValue('');
    }
  }

  // Load doctors
  loadDoctors(): void {
    this.isLoading = true;
    this.doctorService.getAll().subscribe({
      next: (res) => {
        this.doctorsList = res;
        this.filteredDoctors = [...this.doctorsList];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading doctors:', err);
        this.toastService.show('Failed to load doctors list', 'error');
        this.isLoading = false;
      },
    });
  }
searchDoctors(): void {
  if (!this.searchTerm.trim()) {
    this.filteredDoctors = [...this.doctorsList];
  } else {
    const value = this.searchTerm.toLowerCase();
    this.filteredDoctors = this.doctorsList.filter(
      (d) =>
        d.name?.toLowerCase().includes(value) ||
        d.specialization?.toLowerCase().includes(value) ||
        d.qualification?.toLowerCase().includes(value) ||
        d.user?.email?.toLowerCase().includes(value) ||
        d.user?.phoneNumber?.toLowerCase().includes(value) || 
        d.phone?.toLowerCase().includes(value),
    );
  }
}

 loadForEdit(): void {
  if (!this.editId) return;

  this.doctorNotFound = false;
  this.doctorService.getById(this.editId).subscribe({
    next: (res) => {
      const isKnownSpecialization = this.allSpecializations.includes(res.specialization);
      
      const specValue = isKnownSpecialization ? res.specialization : 'Other';
      this.selectedSpecialization = specValue;
      this.specializationSearch = res.specialization;

      // Fix: Use res.user?.phoneNumber or res.phone
      const phoneValue = res.user?.phoneNumber || res.phone || '';

      this.doctorForm.patchValue({
        name: res.name,
        specialization: specValue,
        customSpecialization: isKnownSpecialization ? '' : res.specialization,
        qualification: res.qualification,
        experienceYears: res.experienceYears,
        consultationFee: res.consultationFee,
        email: res.user?.email || '',
        phone: phoneValue,
        isActive: res.isActive,
        password: '',
      });

      this.showCustomSpecialization = !isKnownSpecialization;
      this.doctorForm.get('password')?.clearValidators();
      this.doctorForm.get('password')?.updateValueAndValidity();

      this.focusName();
    },
    error: (err) => {
      console.error('Error loading doctor:', err);
      this.doctorNotFound = true;
      this.editId = null;
      this.doctorForm.reset();
    },
  });
}

  isFieldInvalid(fieldName: string): boolean {
    const field = this.doctorForm.get(fieldName);
    
    if (fieldName === 'password' && this.editId) {
      return !!(field?.invalid && field?.touched);
    }
    
    // Check for 'taken' error specifically
    if (field?.errors && field.errors['taken']) {
      return true;
    }
    
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.doctorForm.get(fieldName);
    if (field?.errors) {
      // Handle taken error first
      if (field.errors['taken']) {
        if (fieldName === 'email') {
          return '❌ This email is already registered. Please use a different email.';
        }
        if (fieldName === 'phone') {
          return '❌ This phone number is already registered. Please use a different number.';
        }
      }
      
      if (fieldName === 'password' && this.editId && !field.touched) {
        return '';
      }
      
      if (field.errors['required']) return 'This field is required';
      if (field.errors['email']) return 'Invalid email address';
      if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} characters required`;
      if (field.errors['maxlength']) return `Maximum ${field.errors['maxlength'].requiredLength} characters`;
      if (field.errors['min']) return `Minimum value is ${field.errors['min'].min}`;
      if (field.errors['max']) return `Maximum value is ${field.errors['max'].max}`;
      if (field.errors['pattern']) {
        if (fieldName === 'phone') {
          return 'Invalid phone format (10-15 digits, e.g., +923001234567)';
        }
        return 'Invalid format';
      }
    }
    return '';
  }

  getFormErrors(): string[] {
    const errors: string[] = [];
    const controls = this.doctorForm.controls;

    if (controls.name.invalid) errors.push('Doctor Name is required');
    if (controls.specialization.invalid) errors.push('Specialization is required');
    if (controls.specialization.value === 'Other' && !controls.customSpecialization.value?.trim()) {
      errors.push('Please enter the specialization name');
    }
    if (controls.qualification.invalid) errors.push('Qualification is required');
    if (controls.experienceYears.invalid) errors.push('Valid Experience Years is required (0-60)');
    if (controls.consultationFee.invalid) errors.push('Valid Consultation Fee is required');
    
    // Email validation with duplicate check
    if (controls.email.invalid) {
      if (controls.email.errors?.['taken']) {
        errors.push('This email is already registered. Please use a different email.');
      } else {
        errors.push('Valid Email is required');
      }
    }
    
    // Phone validation with duplicate check
    if (controls.phone.invalid) {
      if (controls.phone.errors?.['taken']) {
        errors.push('This phone number is already registered. Please use a different number.');
      } else {
        errors.push('Valid Phone is required (10-15 digits)');
      }
    }
    
    if (!this.editId && controls.password.invalid && controls.password.touched) {
      errors.push('Password must be at least 8 characters');
    } else if (this.editId && controls.password.touched && controls.password.invalid) {
      errors.push('Password must be at least 8 characters');
    }

    return errors;
  }

  onSubmit(): void {
    this.doctorForm.markAllAsTouched();

    // Check for duplicate email/phone before submitting
    if (this.doctorForm.get('email')?.errors?.['taken']) {
      this.showErrorSummary = true;
      this.toastService.show('❌ This email is already registered. Please use a different email.', 'error');
      return;
    }

    if (this.doctorForm.get('phone')?.errors?.['taken']) {
      this.showErrorSummary = true;
      this.toastService.show('❌ This phone number is already registered. Please use a different number.', 'error');
      return;
    }

    if (this.doctorForm.get('specialization')?.value === 'Other') {
      const custom = this.doctorForm.get('customSpecialization')?.value?.trim();
      if (!custom) {
        this.showErrorSummary = true;
        this.toastService.show('Please enter the specialization name', 'error');
        return;
      }
    }

    if (this.doctorForm.invalid) {
      this.showErrorSummary = true;
      this.toastService.show('Please fix all errors before submitting', 'error');
      return;
    }

    this.showErrorSummary = false;
    const formData = { ...this.doctorForm.value };
    
    let finalSpecialization = formData.specialization!;
    if (finalSpecialization === 'Other') {
      finalSpecialization = formData.customSpecialization!;
    }

    const payload: any = {
      name: formData.name!,
      specialization: finalSpecialization,
      qualification: formData.qualification!,
      experienceYears: formData.experienceYears!,
      consultationFee: formData.consultationFee!,
      email: formData.email!,
      phone: formData.phone!,
      isActive: formData.isActive,
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    this.isLoading = true;

    if (this.editId) {
      this.doctorService.update(this.editId, payload).subscribe({
        next: () => {
          this.toastService.show('Doctor Updated Successfully!', 'success');
          this.resetForm();
          this.loadDoctors();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error updating doctor:', err);
          const errorMsg = err.error?.message || 'Failed to update doctor';
          this.toastService.show(errorMsg, 'error');
          this.showErrorSummary = true;
          this.isLoading = false;
        },
      });
    } else {
      this.doctorService.create(payload).subscribe({
        next: () => {
          this.toastService.show('Doctor Onboarded Successfully!', 'success');
          this.resetForm();
          this.loadDoctors();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error creating doctor:', err);
          const errorMsg = err.error?.message || 'Failed to create doctor';
          this.toastService.show(errorMsg, 'error');
          this.showErrorSummary = true;
          this.isLoading = false;
        },
      });
    }
  }

  resetForm(): void {
    this.doctorForm.reset({
      isActive: true,
      specialization: '',
      password: '',
    });
    this.selectedSpecialization = '';
    this.specializationSearch = '';
    this.filteredSpecializations = [...this.allSpecializations];
    this.editId = null;
    this.doctorNotFound = false;
    this.showErrorSummary = false;
    this.showCustomSpecialization = false;
    this.clearEmailStatus();
    this.clearPhoneStatus();

    this.doctorForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.doctorForm.get('password')?.updateValueAndValidity();

    this.focusName();
  }

  deleteDoctor(id: string): void {
    if (!confirm('Are you sure you want to delete this doctor?')) return;

    this.doctorService.delete(id).subscribe({
      next: (res) => {
        this.toastService.show(res.message || 'Doctor deleted successfully', 'success');
        this.loadDoctors();
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

  @HostListener('document:click')
  dismissNotFound(): void {
    if (this.doctorNotFound) {
      this.doctorNotFound = false;
    }
  }

  getSpecializationBadge(specialization: string): string {
    const colors: { [key: string]: string } = {
      Cardiology: 'badge-red',
      Neurology: 'badge-blue',
      Orthopedics: 'badge-green',
      Pediatrics: 'badge-yellow',
      Dermatology: 'badge-purple',
      Gynecology: 'badge-pink',
      Ophthalmology: 'badge-teal',
      ENT: 'badge-orange',
    };
    return colors[specialization] || 'badge-gray';
  }

  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}