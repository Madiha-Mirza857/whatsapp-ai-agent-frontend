import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HospitalService } from '../hospital';
import { ToastService } from '../../Services/toastService';
import { NgSelectModule } from '@ng-select/ng-select';
 
interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  recommended?: boolean;
}

interface PaymentMethod {
  id: string;
  label: string;
  icon: string | null;
  colorClass: string;
}

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-hospital-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink,NgSelectModule],
  templateUrl: './hospital-registration.html',
  styleUrl: './hospital-registration.css',
})
export class HospitalRegistration implements OnInit, AfterViewInit {
  @ViewChild('hospitalNameInput')
  hospitalNameInput!: ElementRef<HTMLInputElement>;
  is24Hours = false;

  editId: string | null = null;
  showErrorSummary = false;
  hospitalNotFound = false;

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
  });

  plans = ['basic', 'professional', 'enterprise'];
  statuses = ['pending', 'active', 'suspended'];
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

  if (fieldName === 'password' && this.editId) {
    return !!(field?.invalid && field?.touched);
  }

  return !!(field?.invalid && (field?.dirty || field?.touched));
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

  daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];


  constructor(
    private route: ActivatedRoute,
    private hospitalService: HospitalService,
    private cdr: ChangeDetectorRef,
    public toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.editId =
      this.route.snapshot.paramMap.get('id') ||
      this.route.snapshot.queryParamMap.get('id');

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

  focusHospitalName(): void {
    setTimeout(() => this.hospitalNameInput?.nativeElement.focus(), 0);
  }

  loadForEdit(): void {
    if (!this.editId) return;

    this.hospitalNotFound = false;
    this.hospitalService.getById(this.editId).subscribe({
      next: (res: any) => {
        // Extract fields from nested user entity or root fields
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
        });
        this.is24Hours = res.is24Hours || false;

        // Password is optional during edit
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

  onSubmit(): void {
    this.hospitalForm.markAllAsTouched();

    if (this.hospitalForm.invalid) {
      this.showErrorSummary = true;
      return;
    }

    this.showErrorSummary = false;
    const formData = { ...this.hospitalForm.value };

    if (!formData.password) delete formData.password;

    if (this.editId) {
      this.hospitalService.update(this.editId, formData as any).subscribe({
        next: () => {
          this.toastService.show('Hospital Updated Successfully!', 'success');
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
          this.toastService.show('Hospital Onboarded Successfully!', 'success');
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
    });
    this.editId = null;
    this.hospitalNotFound = false;

    // Reset password validator back to required for new registrations
    this.hospitalForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.hospitalForm.get('password')?.updateValueAndValidity();
   
    this.is24Hours = false;
    this.focusHospitalName();
  }

  getFormErrors(): string[] {
    const errors: string[] = [];
    const controls = this.hospitalForm.controls;

    if (controls.hospitalName.invalid) errors.push('Hospital Name is required (Max 150 chars)');
    if (controls.adminName.invalid) errors.push('Admin Name is required');
    if (controls.adminEmail.invalid) errors.push('Valid Admin Email is required');
    if (controls.adminPhone.invalid) errors.push('Valid Admin Phone is required (10-15 digits)');
    if (controls.password.invalid) errors.push('Password must be at least 8 characters long');
    if (controls.contactPhone.invalid) errors.push('Contact Phone must be 10-15 digits');

    return errors;
  }

  @HostListener('document:click')
  dismissHospitalNotFound(): void {
    if (this.hospitalNotFound) {
      this.hospitalNotFound = false;
    }
  }
}