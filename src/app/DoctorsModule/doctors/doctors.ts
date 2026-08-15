import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, AfterViewInit, ViewChild, HostListener, ChangeDetectorRef } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Doctor, DoctorService } from '../doctor-service';
import { ToastService } from '../../Services/toastService';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink,FormsModule],
  templateUrl: './doctors.html',
  styleUrl: './doctors.css',
})
export class Doctors implements OnInit, AfterViewInit {
  @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
// Add this with other ViewChild declarations
@ViewChild('passwordInput') passwordInput!: ElementRef<HTMLInputElement>;
  editId: string | null = null;
  showErrorSummary = false;
  doctorNotFound = false;
  isLoading = false;
  doctorsList: Doctor[] = [];
  filteredDoctors: Doctor[] = [];
  searchTerm: string = '';

  // ✅ Searchable dropdown properties
  isDropdownOpen = false;
  specializationSearch: string = '';
  filteredSpecializations: string[] = [];
  selectedSpecialization: string = '';

  // ✅ All specializations
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

 
  showCustomSpecialization = false;

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
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl('', [Validators.required, Validators.pattern(/^[0-9+]{10,15}$/)]),
    password: new FormControl('',[Validators.required,Validators.minLength(8)]),
    isActive: new FormControl(true),
  });

  @HostListener('document:click', ['$event'])
onDocumentClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  // Check if click is outside the dropdown
  const dropdown = document.querySelector('.searchable-dropdown');
  if (dropdown && !dropdown.contains(target)) {
    this.isDropdownOpen = false;
  }
}
  constructor(
    private doctorService: DoctorService,
    private router: Router,
    private toastService: ToastService,
    private cdr:ChangeDetectorRef
  ) {}

 ngOnInit(): void {
  // Get edit ID from URL params
  this.editId = new URLSearchParams(window.location.search).get('id');
  // Check if token exists
console.log(localStorage.getItem('access_token'));

// Check if user data exists
console.log(localStorage.getItem('user'));
  // Initialize filtered specializations
  this.filteredSpecializations = [...this.allSpecializations];


  this.doctorForm.get('specialization')?.valueChanges.subscribe((value) => {
    this.showCustomSpecialization = value === 'Other';
    if (!this.showCustomSpecialization) {
      this.doctorForm.get('customSpecialization')?.setValue('');
    }
  });

  // Load doctors if editing
  if (this.editId) {
    this.loadForEdit();
  } else {
    // Set password validator for new doctor
    this.doctorForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.doctorForm.get('password')?.updateValueAndValidity();
  }
}
  ngAfterViewInit(): void {
  this.focusName();
  
  // ✅ Handle browser auto-fill for password
  setTimeout(() => {
    const passwordControl = this.doctorForm.get('password');
    if (passwordControl?.value) {
      // If auto-filled, mark as untouched to prevent error blinking
      passwordControl.markAsUntouched();
      passwordControl.markAsPristine();
    }
  }, 500);
}



@HostListener('animationstart', ['$event'])
onAnimationStart(event: AnimationEvent): void {
  if (event.animationName === 'onAutoFillStart' || event.animationName === 'onAutoFillEnd') {
    const passwordControl = this.doctorForm.get('password');
    if (passwordControl?.value) {
      passwordControl.markAsUntouched();
      passwordControl.markAsPristine();
      this.cdr?.detectChanges(); 
    }
  }
}
  focusName(): void {
    setTimeout(() => this.nameInput?.nativeElement?.focus(), 0);
  }

  // ✅ Add these properties
highlightedIndex: number = -1;
searchInputValue: string = '';

// ✅ Handle search input (replaces ngModel)
onSearchInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  this.searchInputValue = input.value;
  this.filterSpecializations(input.value);
  this.highlightedIndex = -1;
}

// ✅ Handle keyboard navigation
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

// ✅ Scroll to highlighted item
scrollToHighlighted(items: NodeListOf<Element>): void {
  const highlightedItem = items[this.highlightedIndex] as HTMLElement;
  if (highlightedItem) {
    highlightedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// ✅ Updated filter method
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

// ✅ Updated toggleDropdown
toggleDropdown(): void {
  this.isDropdownOpen = !this.isDropdownOpen;
  console.log('Dropdown open:', this.isDropdownOpen);
  if (this.isDropdownOpen) {
    this.searchInputValue = '';
    this.highlightedIndex = -1;
    this.filteredSpecializations = [...this.allSpecializations];
    setTimeout(() => this.searchInput?.nativeElement?.focus(), 100);
  }
}



// ✅ This sets the flag when selecting from dropdown
selectSpecialization(spec: string): void {
  this.selectedSpecialization = spec;
  this.doctorForm.patchValue({ specialization: spec });
  this.searchInputValue = spec;
  this.isDropdownOpen = false;
  this.highlightedIndex = -1;
  
  // ✅ Show custom input if "Other" is selected
  this.showCustomSpecialization = spec === 'Other';
  if (spec !== 'Other') {
    this.doctorForm.get('customSpecialization')?.setValue('');
  }
}
  // ✅ Load doctors
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
          d.email?.toLowerCase().includes(value) ||
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

      this.doctorForm.patchValue({
        name: res.name,
        specialization: specValue,
        customSpecialization: isKnownSpecialization ? '' : res.specialization,
        qualification: res.qualification,
        experienceYears: res.experienceYears,
        consultationFee: res.consultationFee,
        email: res.user?.email || '',
        phone: res.user?.phoneNumber || '',
        isActive: res.isActive,
        // ✅ Don't set password - leave it empty
        password: '',
      });

      this.showCustomSpecialization = !isKnownSpecialization;

      // ✅ Remove required validator for password in edit mode
      this.doctorForm.get('password')?.clearValidators();
      this.doctorForm.get('password')?.updateValueAndValidity();

      this.focusName();
    },
    error: () => {
      this.doctorNotFound = true;
      this.editId = null;
      this.doctorForm.reset();
    },
  });
}
isFieldInvalid(fieldName: string): boolean {
  const field = this.doctorForm.get(fieldName);
  
  // ✅ For password in edit mode: only show error if touched AND invalid
  if (fieldName === 'password' && this.editId) {
    return !!(field?.invalid && field?.touched);
  }
  
  return !!(field?.invalid && (field?.dirty || field?.touched));
}

 
getFieldError(fieldName: string): string {
  const field = this.doctorForm.get(fieldName);
  if (field?.errors) {
   
    if (fieldName === 'password' && this.editId && !field.touched) {
      return '';
    }
    
    if (field.errors['required']) return 'This field is required';
    if (field.errors['email']) return 'Invalid email address';
    if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} characters required`;
    if (field.errors['maxlength']) return `Maximum ${field.errors['maxlength'].requiredLength} characters`;
    if (field.errors['min']) return `Minimum value is ${field.errors['min'].min}`;
    if (field.errors['max']) return `Maximum value is ${field.errors['max'].max}`;
    if (field.errors['pattern']) return 'Invalid format';
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
  if (controls.email.invalid) errors.push('Valid Email is required');
  if (controls.phone.invalid) errors.push('Valid Phone is required (10-15 digits)');
  
  // ✅ Fix: Only check password if NOT in edit mode OR password field is touched
  if (!this.editId) {
    if (controls.password.invalid && controls.password.touched) {
      errors.push('Password must be at least 8 characters');
    }
  } else {
    // In edit mode, only show error if user has touched the password field
    if (controls.password.touched && controls.password.invalid) {
      errors.push('Password must be at least 8 characters');
    }
  }

  return errors;
}
  onSubmit(): void {
    this.doctorForm.markAllAsTouched();

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
      return;
    }

    this.showErrorSummary = false;
    const formData = { ...this.doctorForm.value };
    
    let finalSpecialization = formData.specialization!;
    if (finalSpecialization === 'Other') {
      finalSpecialization = formData.customSpecialization!;
    }

    const payload = {
      name: formData.name!,
      specialization: finalSpecialization,
      qualification: formData.qualification!,
      experienceYears: formData.experienceYears!,
      consultationFee: formData.consultationFee!,
      email: formData.email!,
      phone: formData.phone!,
      ...(formData.password ? { password: formData.password } : {}),
    };

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
          this.toastService.show(err.error?.message || 'Failed to update doctor', 'error');
          this.showErrorSummary = true;
          this.isLoading = false;
        },
      });
    } else {
      this.doctorService.create(payload as any).subscribe({
        next: () => {
          this.toastService.show('Doctor Onboarded Successfully!', 'success');
          this.resetForm();
          this.loadDoctors();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error creating doctor:', err);
          this.toastService.show(err.error?.message || 'Failed to create doctor', 'error');
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