import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, AfterViewInit, ViewChild, OnDestroy } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HospitalService, EmailAvailabilityResponse, PhoneAvailabilityResponse } from '../hospital';
import { ToastService } from '../../Services/toastService';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, takeUntil } from 'rxjs';

@Component({
  selector: 'app-hospital-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NgSelectModule],
  templateUrl: './hospital-registration.html',
  styleUrl: './hospital-registration.css',
})
export class HospitalRegistration implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('hospitalNameInput') hospitalNameInput!: ElementRef<HTMLInputElement>;
  is24Hours = false;

  editId: string | null = null;
  showErrorSummary = false;
  hospitalNotFound = false;

  // ✅ Email/Phone availability check
  isEmailChecking = false;
  isPhoneChecking = false;
  emailCheckMessage = '';
  phoneCheckMessage = '';
  emailAvailable = false;
  phoneAvailable = false;
  
  // ✅ Debounce subjects
  private emailSubject = new Subject<string>();
  private phoneSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  hospitalForm = new FormGroup({
    hospitalName: new FormControl('', [Validators.required, Validators.maxLength(150)]),
    address: new FormControl(''),
    contactPhone: new FormControl('', [
      Validators.pattern(/^[0-9+]{10,15}$/),
    ]),
    adminName: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    adminEmail: new FormControl('', [
      Validators.required,
      Validators.email,
      Validators.maxLength(100),
    ]),
    adminPhone: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9+]{10,15}$/),
    ]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(8)
    ]),
    plan: new FormControl('basic', Validators.required),
    status: new FormControl('pending'),
    openingTime: new FormControl<string>(''),
    closingTime: new FormControl<string>(''),
    workingDays: new FormControl<string[]>([]),
    is24Hours: new FormControl<boolean>(false),
    holidays: new FormControl<string[]>([]),
    whatsappPhoneNumberId: new FormControl(''),
  });

  plans = ['basic', 'professional', 'enterprise'];
  statuses = ['pending', 'active', 'suspended'];
  daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  constructor(
    private route: ActivatedRoute,
    private hospitalService: HospitalService,
    private cdr: ChangeDetectorRef,
    public toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.editId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.queryParamMap.get('id');

    // ✅ Setup debounced email validation
    this.emailSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap((email) => {
        if (!email || this.hospitalForm.get('adminEmail')?.invalid) {
          this.clearEmailStatus();
          return of(null);
        }
        this.isEmailChecking = true;
        return this.hospitalService.checkEmailAvailability(email, this.editId || undefined);
      }),
      takeUntil(this.destroy$)
    ).subscribe((result) => {
      this.isEmailChecking = false;
      if (result) {
        this.emailAvailable = result.available;
        this.emailCheckMessage = result.message;
        
        const emailControl = this.hospitalForm.get('adminEmail');
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

    // ✅ Setup debounced phone validation
    this.phoneSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap((phone) => {
        if (!phone || this.hospitalForm.get('adminPhone')?.invalid) {
          this.clearPhoneStatus();
          return of(null);
        }
        this.isPhoneChecking = true;
        return this.hospitalService.checkPhoneAvailability(phone, this.editId || undefined);
      }),
      takeUntil(this.destroy$)
    ).subscribe((result) => {
      this.isPhoneChecking = false;
      if (result) {
        this.phoneAvailable = result.available;
        this.phoneCheckMessage = result.message;
        
        const phoneControl = this.hospitalForm.get('adminPhone');
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

    if (this.editId) {
      this.loadForEdit();
    } else {
      this.hospitalForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
      this.hospitalForm.get('password')?.updateValueAndValidity();
    }
  }

  ngAfterViewInit(): void {
    this.focusHospitalName();
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

  // ✅ Trigger email check on input
  onEmailInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.emailSubject.next(input.value);
  }

  // ✅ Trigger phone check on input
  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.phoneSubject.next(input.value);
  }

  focusHospitalName(): void {
    setTimeout(() => this.hospitalNameInput?.nativeElement.focus(), 0);
  }

  isDaySelected(day: string): boolean {
    const workingDays = this.hospitalForm.get('workingDays')?.value as string[] || [];
    return workingDays.includes(day);
  }

  onDayChange(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const day = checkbox.value;
    const currentDays = this.hospitalForm.get('workingDays')?.value as string[] || [];

    if (checkbox.checked) {
      this.hospitalForm.patchValue({
        workingDays: [...currentDays, day]
      });
    } else {
      this.hospitalForm.patchValue({
        workingDays: currentDays.filter(d => d !== day)
      });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.hospitalForm.get(fieldName);

    // Check for 'taken' error specifically
    if (field?.errors && field.errors['taken']) {
      return true;
    }

    if (fieldName === 'password' && this.editId) {
      return !!(field?.invalid && field?.touched);
    }

    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.hospitalForm.get(fieldName);
    if (field?.errors) {
      // ✅ Handle taken error first
      if (field.errors['taken']) {
        if (fieldName === 'adminEmail') {
          return '❌ This email is already registered. Please use a different email.';
        }
        if (fieldName === 'adminPhone') {
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
      if (field.errors['pattern']) {
        if (fieldName === 'adminPhone' || fieldName === 'contactPhone') {
          return 'Invalid format (10-15 digits, e.g., +923001234567)';
        }
        return 'Invalid format';
      }
    }
    return '';
  }

  toggle24Hours(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.is24Hours = checked;
    this.hospitalForm.patchValue({ is24Hours: checked });
    
    if (checked) {
      this.hospitalForm.patchValue({
        openingTime: '00:00',
        closingTime: '23:59'
      });
    } else {
      this.hospitalForm.patchValue({
        openingTime: '09:00',
        closingTime: '17:00'
      });
    }
  }

  loadForEdit(): void {
    if (!this.editId) return;

    this.hospitalNotFound = false;
    this.hospitalService.getById(this.editId).subscribe({
      next: (res: any) => {
        const adminEmail = res.user?.email || res.adminEmail || '';
        const adminPhone = res.user?.phoneNumber || res.adminPhone || res.contactPhone || '';

        this.hospitalForm.patchValue({
          hospitalName: res.hospitalName,
          address: res.address,
          contactPhone: res.contactPhone,
          adminName: res.adminName,
          adminEmail: adminEmail,
          adminPhone: adminPhone,
          plan: res.plan,
          status: res.status,
          openingTime: res.openingTime || '09:00',
          closingTime: res.closingTime || '17:00',
          workingDays: res.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          is24Hours: res.is24Hours || false,
          holidays: res.holidays || [],
          whatsappPhoneNumberId: res.whatsappPhoneNumberId || '',
        });
        this.is24Hours = res.is24Hours || false;

        this.hospitalForm.get('password')?.clearValidators();
        this.hospitalForm.get('password')?.updateValueAndValidity();

        this.focusHospitalName();
        this.cdr.detectChanges();
      },
      error: () => {
        this.hospitalNotFound = true;
        this.editId = null;
        this.hospitalForm.reset();
        this.cdr.detectChanges();
      },
    });
  }

  getFormErrors(): string[] {
    const errors: string[] = [];
    const controls = this.hospitalForm.controls;

    if (controls.hospitalName.invalid) errors.push('Hospital Name is required (Max 150 chars)');
    if (controls.adminName.invalid) errors.push('Admin Name is required');
    
    // ✅ Email validation with duplicate check
    if (controls.adminEmail.invalid) {
      if (controls.adminEmail.errors?.['taken']) {
        errors.push('This email is already registered. Please use a different email.');
      } else {
        errors.push('Valid Admin Email is required');
      }
    }
    
    // ✅ Phone validation with duplicate check
    if (controls.adminPhone.invalid) {
      if (controls.adminPhone.errors?.['taken']) {
        errors.push('This phone number is already registered. Please use a different number.');
      } else {
        errors.push('Valid Admin Phone is required (10-15 digits)');
      }
    }
    
    if (controls.password.invalid) errors.push('Password must be at least 8 characters long');
    if (controls.contactPhone.invalid) errors.push('Contact Phone must be 10-15 digits');

    return errors;
  }

  onSubmit(): void {
    this.hospitalForm.markAllAsTouched();

    // ✅ Check for duplicate email/phone before submitting
    if (this.hospitalForm.get('adminEmail')?.errors?.['taken']) {
      this.showErrorSummary = true;
      this.toastService.show('❌ This email is already registered. Please use a different email.', 'error');
      return;
    }

    if (this.hospitalForm.get('adminPhone')?.errors?.['taken']) {
      this.showErrorSummary = true;
      this.toastService.show('❌ This phone number is already registered. Please use a different number.', 'error');
      return;
    }

    if (this.hospitalForm.invalid) {
      this.showErrorSummary = true;
      this.toastService.show('Please fix all errors before submitting', 'error');
      return;
    }

    this.showErrorSummary = false;
    const formData = { ...this.hospitalForm.value };

    if (!formData.password) delete formData.password;
    if (!formData.whatsappPhoneNumberId) delete formData.whatsappPhoneNumberId;

    if (this.editId) {
      this.hospitalService.update(this.editId, formData as any).subscribe({
        next: () => {
          this.toastService.show('✅ Hospital Updated Successfully!', 'success');
          this.resetForm();
        },
        error: (err) => {
          console.error('Error updating hospital:', err);
          const errorMessage = err.error?.message || 'Failed to update hospital';
          this.toastService.show(errorMessage, 'error');
          this.showErrorSummary = true;
        },
      });
    } else {
      this.hospitalService.register(formData as any).subscribe({
        next: () => {
          this.toastService.show('✅ Hospital Onboarded Successfully!', 'success');
          this.resetForm();
        },
        error: (err) => {
          console.error('Error registering hospital:', err);
          const errorMessage = err.error?.message || 'Failed to register hospital';
          this.toastService.show(errorMessage, 'error');
          this.showErrorSummary = true;
        },
      });
    }
  }

  resetForm(): void {
    this.hospitalForm.reset({
      plan: 'basic',
      status: 'pending',
      openingTime: '09:00',
      closingTime: '17:00',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      is24Hours: false,
      holidays: [],
      whatsappPhoneNumberId: '',
    });
    this.editId = null;
    this.hospitalNotFound = false;
    this.clearEmailStatus();
    this.clearPhoneStatus();

    this.hospitalForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.hospitalForm.get('password')?.updateValueAndValidity();

    this.is24Hours = false;
    this.focusHospitalName();
  }

  @HostListener('document:click')
  dismissHospitalNotFound(): void {
    if (this.hospitalNotFound) {
      this.hospitalNotFound = false;
    }
  }
}