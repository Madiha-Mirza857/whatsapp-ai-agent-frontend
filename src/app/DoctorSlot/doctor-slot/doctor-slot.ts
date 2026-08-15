import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ToastService } from '../../Services/toastService';

import { DoctorSlot, DoctorSlotService } from '../doctor-slot-service';
import { DoctorService } from '../../DoctorsModule/doctor-service';
import { TableNavigationDirective } from '../../Directives/TableNavigation';
import { AuthService } from '../../auth/auth-service';

@Component({
  selector: 'app-doctor-slot',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormsModule, TableNavigationDirective],
  templateUrl: './doctor-slot.html',
  styleUrl: './doctor-slot.css',
})
export class DoctorSlotComponent implements OnInit, AfterViewInit {
  @ViewChild('dateInput') dateInput!: ElementRef<HTMLInputElement>;

  isLoading = false;
  slots: DoctorSlot[] = [];
  filteredSlots: DoctorSlot[] = [];
  searchTerm: string = '';
  showBulkForm = false;
  showPreview = false;
  previewData: any = null;
  bulkGenerated = false;
  bulkResult: any = null;
  doctors: any[] = [];
  isAdmin = false;
  isDoctor = false;
  currentUser: any = null;

  // Forms
  singleForm!: FormGroup;
  bulkForm!: FormGroup;
  editForm!: FormGroup;

  // Options
  statusOptions = ['available', 'reserved', 'booked'];
  durationOptions = [15, 30, 45, 60];

  // Bulk selection
  selectedSlotIds: string[] = [];
  showEditModal = false;
  editingSlot: DoctorSlot | null = null;

  // Searchable dropdown
  isDropdownOpen = false;
  doctorSearch: string = '';
  filteredDoctors: any[] = [];
  highlightedIndex = -1;
  selectedDoctorId: string = '';

  // Today's date for default
  todayDate: string = '';

  constructor(
    private fb: FormBuilder,
    private slotService: DoctorSlotService,
    private doctorService: DoctorService,
    private authService: AuthService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}
  

  ngOnInit(): void {
    // Set today's date
    const today = new Date();
    this.todayDate = today.toISOString().split('T')[0];

    // Get current user from auth service
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      this.isAdmin = this.currentUser.role === 'HOSPITAL_ADMIN' || this.currentUser.role === 'SUPER_ADMIN';
      this.isDoctor = this.currentUser.role === 'DOCTOR';
    }

    this.initForms();
    this.loadSlots();
    
    // Only load doctors if admin
    if (this.isAdmin) {
      this.loadDoctors();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.dateInput?.nativeElement?.focus(), 100);
  }

  initForms(): void {
    // Single slot form with today's date as default
    this.singleForm = this.fb.group({
      date: [this.todayDate, Validators.required],
      startTime: ['09:00', Validators.required],
      endTime: ['17:00', Validators.required],
      slotDurationMinutes: [30, [Validators.required, Validators.min(5), Validators.max(240)]],
      doctorId: [''],
    });

    // If admin, doctorId is required
    if (this.isAdmin) {
      this.singleForm.get('doctorId')?.setValidators([Validators.required]);
    } else {
      this.singleForm.get('doctorId')?.clearValidators();
    }
    this.singleForm.get('doctorId')?.updateValueAndValidity();

    // Bulk form
    this.bulkForm = this.fb.group({
      startDate: [this.todayDate, Validators.required],
      endDate: [this.todayDate, Validators.required],
      startTime: ['09:00', Validators.required],
      endTime: ['17:00', Validators.required],
      slotDurationMinutes: [30, [Validators.required, Validators.min(5), Validators.max(240)]],
      doctorIds: [[]],
    });

    // Edit form
    this.editForm = this.fb.group({
      editDate: ['', Validators.required],
      editStartTime: ['', Validators.required],
      editEndTime: ['', Validators.required],
      editStatus: ['', Validators.required],
    });
  }

  loadDoctors(): void {
    this.doctorService.getAll().subscribe({
      next: (res) => {
        this.doctors = res;
        this.filteredDoctors = [...res];
        this.cdr.detectChanges();
        console.log("doctors",res)
      },
      error: (err) => {
        console.error('Error loading doctors:', err);
      },
    });
  }

  loadSlots(): void {
    this.isLoading = true;
    this.slotService.getAllSlots().subscribe({
      next: (res) => {
        this.slots = res;
        this.filteredSlots = [...this.slots];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading slots:', err);
        this.toastService.show('Failed to load slots', 'error');
        this.isLoading = false;
      },
    });
  }

  searchSlots(): void {
    if (!this.searchTerm.trim()) {
      this.filteredSlots = [...this.slots];
    } else {
      const value = this.searchTerm.toLowerCase();
      this.filteredSlots = this.slots.filter(
        (s) =>
          s.doctor?.name?.toLowerCase().includes(value) ||
          s.doctor?.specialization?.toLowerCase().includes(value) ||
          s.status?.toLowerCase().includes(value) ||
          new Date(s.startTime).toLocaleDateString().includes(value)
      );
    }
  }

  
  


 generateSlots(): void {
  // ✅ First check if form is valid
  if (this.singleForm.invalid) {
    this.singleForm.markAllAsTouched();
    // ✅ Show specific error for doctorId if admin
    if (this.isAdmin && !this.singleForm.get('doctorId')?.value) {
      this.toastService.show('Please select a doctor from the dropdown', 'error');
    }
    return;
  }

  // ✅ Admin must select a doctor
  if (this.isAdmin) {
    const doctorId = this.singleForm.get('doctorId')?.value;
    if (!doctorId) {
      this.toastService.show('Please select a doctor from the dropdown', 'error');
      return;
    }
  }

  this.isLoading = true;
  const payload = { ...this.singleForm.value };

  // ✅ If doctor role, remove doctorId
  if (this.isDoctor) {
    delete payload.doctorId;
  }

  // ✅ For admin, ensure doctorId is sent
  // If it's an empty string, don't send the request
  if (this.isAdmin && !payload.doctorId) {
    this.toastService.show('Please select a doctor', 'error');
    this.isLoading = false;
    return;
  }

  this.slotService.generateSlots(payload).subscribe({
    next: (res) => {
      this.isLoading = false;
      this.toastService.show(res.message || 'Slots generated successfully!', 'success');
      this.loadSlots();
      this.singleForm.patchValue({
        date: this.todayDate,
        startTime: '09:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
        doctorId: '',
      });
      this.selectedDoctorId = '';
      this.cdr.detectChanges();
    },
    error: (err) => {
      this.isLoading = false;
      const message = err.error?.message || 'Failed to generate slots';
      this.toastService.show(message, 'error');
      console.error('Generate slots error:', err);
    },
  });
}

  previewBulkSlots(): void {
    if (!this.isAdmin) {
      this.toastService.show('Only admins can generate bulk slots', 'error');
      return;
    }

    if (this.bulkForm.invalid) {
      this.bulkForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.showPreview = false;
    const payload = this.bulkForm.value;

    this.slotService.previewBulkSlots(payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.previewData = res;
        this.showPreview = true;
        this.bulkGenerated = false;
        this.bulkResult = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        const message = err.error?.message || 'Failed to preview';
        this.toastService.show(message, 'error');
      },
    });
  }

  generateBulkSlots(): void {
    if (!this.isAdmin) {
      this.toastService.show('Only admins can generate bulk slots', 'error');
      return;
    }

    if (this.bulkForm.invalid) {
      this.bulkForm.markAllAsTouched();
      return;
    }

    if (!confirm('Are you sure you want to generate slots in bulk?')) {
      return;
    }

    this.isLoading = true;
    const payload = this.bulkForm.value;

    this.slotService.generateBulkSlots(payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.bulkResult = res;
        this.bulkGenerated = true;
        this.showPreview = false;
        this.toastService.show(res.message || 'Bulk slots generated!', 'success');
        this.loadSlots();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        const message = err.error?.message || 'Failed to generate bulk slots';
        this.toastService.show(message, 'error');
      },
    });
  }

  toggleBulkForm(): void {
    if (!this.isAdmin) {
      this.toastService.show('Only admins can generate bulk slots', 'error');
      return;
    }
    this.showBulkForm = !this.showBulkForm;
    if (!this.showBulkForm) {
      this.showPreview = false;
      this.bulkGenerated = false;
      this.previewData = null;
      this.bulkResult = null;
    }
  }

  // =============================
  // BULK SELECTION
  // =============================
  toggleSlotSelection(id: string): void {
    const index = this.selectedSlotIds.indexOf(id);
    if (index > -1) {
      this.selectedSlotIds.splice(index, 1);
    } else {
      this.selectedSlotIds.push(id);
    }
  }

  isSlotSelected(id: string): boolean {
    return this.selectedSlotIds.includes(id);
  }

  toggleSelectAll(): void {
    if (this.isAllSelected) {
      this.selectedSlotIds = [];
    } else {
      this.selectedSlotIds = this.filteredSlots.map(s => s.id);
    }
  }

  get isAllSelected(): boolean {
    return this.filteredSlots.length > 0 &&
      this.selectedSlotIds.length === this.filteredSlots.length;
  }

  selectAllSlots(): void {
    this.selectedSlotIds = this.filteredSlots.map(s => s.id);
  }

  deselectAllSlots(): void {
    this.selectedSlotIds = [];
  }

  bulkDeleteSlots(): void {
    if (this.selectedSlotIds.length === 0) {
      this.toastService.show('No slots selected');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${this.selectedSlotIds.length} slots?`)) {
      return;
    }

    this.isLoading = true;
    const deletePromises = this.selectedSlotIds.map(id =>
      this.slotService.deleteSlot(id).toPromise()
    );

    Promise.all(deletePromises).then(() => {
      this.isLoading = false;
      const count = this.selectedSlotIds.length;
      this.selectedSlotIds = [];
      this.toastService.show(`${count} slots deleted successfully`, 'success');
      this.loadSlots();
      this.cdr.detectChanges();
    }).catch((err) => {
      this.isLoading = false;
      this.toastService.show('Failed to delete some slots', 'error');
      console.error(err);
    });
  }

  // =============================
  // SLOT CRUD OPERATIONS
  // =============================
  deleteSlot(id: string): void {
    if (!confirm('Are you sure you want to delete this slot?')) {
      return;
    }

    this.slotService.deleteSlot(id).subscribe({
      next: (res) => {
        this.toastService.show(res.message || 'Slot deleted successfully', 'success');
        this.loadSlots();
      },
      error: (err) => {
        const message = err.error?.message || 'Failed to delete slot';
        this.toastService.show(message, 'error');
      },
    });
  }

  updateStatus(id: string, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const status = select.value as 'available' | 'reserved' | 'booked';

    this.slotService.updateSlot(id, { status }).subscribe({
      next: () => {
        this.toastService.show(`Slot status updated to ${status}`, 'success');
        this.loadSlots();
      },
      error: (err) => {
        const message = err.error?.message || 'Failed to update status';
        this.toastService.show(message, 'error');
      },
    });
  }

  // =============================
  // EDIT SLOT MODAL
  // =============================
  editSlot(slot: DoctorSlot): void {
    this.editingSlot = slot;
    this.editForm.patchValue({
      editDate: slot.startTime.split('T')[0],
      editStartTime: slot.startTime.split('T')[1]?.substring(0, 5) || '09:00',
      editEndTime: slot.endTime.split('T')[1]?.substring(0, 5) || '17:00',
      editStatus: slot.status,
    });
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingSlot = null;
  }

  saveEditSlot(): void {
    if (this.editForm.invalid || !this.editingSlot) {
      return;
    }

    this.isLoading = true;
    const values = this.editForm.value;
    const payload = {
      startTime: `${values.editDate}T${values.editStartTime}:00`,
      endTime: `${values.editDate}T${values.editEndTime}:00`,
      status: values.editStatus,
    };

    this.slotService.updateSlot(this.editingSlot.id, payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.show('Slot updated successfully', 'success');
        this.closeEditModal();
        this.loadSlots();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.show(err.error?.message || 'Failed to update slot', 'error');
      },
    });
  }

  // =============================
  // TABLE NAVIGATION METHODS
  // =============================
  private getRecordFromRow(rowEl: HTMLElement): DoctorSlot | null {
    const index = rowEl.getAttribute('data-index');
    if (index !== null) {
      const idx = parseInt(index, 10);
      return this.filteredSlots[idx] || null;
    }
    return null;
  }

  onUpdate = (rowEl: HTMLElement): void => {
    const record = this.getRecordFromRow(rowEl);
    if (record) {
      this.editSlot(record);
    }
  };

  onDelete = (rowEl: HTMLElement): void => {
    const record = this.getRecordFromRow(rowEl);
    if (record) {
      this.deleteSlot(record.id);
    }
  };

  onDetails = (rowEl: HTMLElement): void => {
    const record = this.getRecordFromRow(rowEl);
    if (record) {
      this.router.navigate(['/admin/slot-details'], { queryParams: { id: record.id } });
    }
  };

  // =============================
  // HELPER METHODS
  // =============================
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }

  formatTime(date: string): string {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getDoctorName(slot: DoctorSlot): string {
    return slot.doctor?.name || 'Unknown Doctor';
  }

  getDoctorSpec(slot: DoctorSlot): string {
    return slot.doctor?.specialization || 'N/A';
  }

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['min']) return `Minimum value is ${field.errors['min'].min}`;
      if (field.errors['max']) return `Maximum value is ${field.errors['max'].max}`;
    }
    return '';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      available: 'Available',
      reserved: 'Reserved',
      booked: 'Booked',
    };
    
    return labels[status] || status;
  }







  // =============================
// SEARCHABLE DROPDOWN METHODS (Like Specialization)
// =============================



// Toggle dropdown
toggleDropdown(): void {
  console.log('🔽 Dropdown clicked!');
  console.log('🔽 Current state:', this.isDropdownOpen);
  
  this.isDropdownOpen = !this.isDropdownOpen;
  if (this.isDropdownOpen) {
    this.doctorSearch = '';
    this.filteredDoctors = [...this.doctors];
    this.highlightedIndex = -1;
    console.log('🔽 Doctors in dropdown:', this.filteredDoctors);
    // Focus the search input after dropdown opens
    setTimeout(() => {
      const searchInput = document.querySelector('.dropdown-search-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
  }
}

// Handle search input
onSearchInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  this.doctorSearch = input.value;
  this.filterDoctors();
  this.highlightedIndex = -1;
}

// Filter doctors
filterDoctors(): void {
  const search = this.doctorSearch.toLowerCase().trim();
  if (!search) {
    this.filteredDoctors = [...this.doctors];
  } else {
    this.filteredDoctors = this.doctors.filter(
      (d) =>
        d.name.toLowerCase().includes(search) ||
        d.specialization.toLowerCase().includes(search)
    );
  }
}

// Select doctor
selectDoctor(doctor: any): void {
  this.selectedDoctorId = doctor.id;
  this.singleForm.patchValue({ doctorId: doctor.id });
  this.isDropdownOpen = false;
  this.doctorSearch = '';
  this.cdr.detectChanges();
  
  console.log('✅ Selected doctor ID:', doctor.id);
  console.log('✅ Form value:', this.singleForm.value);
}

// Get selected doctor name for display
getSelectedDoctorName(): string {
  if (!this.selectedDoctorId) return '';
  const doctor = this.doctors.find(d => d.id === this.selectedDoctorId);
  return doctor ? `Dr. ${doctor.name} - ${doctor.specialization}` : '';
}

// Keyboard navigation
onDropdownKeydown(event: KeyboardEvent): void {
  const items = this.filteredDoctors;
  if (items.length === 0) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    this.highlightedIndex = (this.highlightedIndex + 1) % items.length;
    this.scrollToHighlighted();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    this.highlightedIndex = (this.highlightedIndex - 1 + items.length) % items.length;
    this.scrollToHighlighted();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    if (this.highlightedIndex >= 0 && this.highlightedIndex < items.length) {
      this.selectDoctor(items[this.highlightedIndex]);
    }
  } else if (event.key === 'Escape') {
    this.isDropdownOpen = false;
  }
}

// Scroll to highlighted item
scrollToHighlighted(): void {
  const items = document.querySelectorAll('.dropdown-item');
  const highlightedItem = items[this.highlightedIndex] as HTMLElement;
  if (highlightedItem) {
    highlightedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
}