import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { Subscription } from 'rxjs';
import { AuthService } from '../../auth/auth-service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: string[];
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit, OnDestroy {
  currentUser: any = null;
  role = '';
  collapsed = false;
  private userSubscription: Subscription | null = null;

  @Output() collapseToggled = new EventEmitter<boolean>();

  private allNavItems: NavItem[] = [
    { label: 'Dashboard', icon: 'fa-gauge-high', route: '/admin/dashboard', roles: ['HOSPITAL_ADMIN'] },
    { label: 'Dashboard', icon: 'fa-gauge-high', route: '/doctor/dashboard', roles: ['DOCTOR'] },
    { label: 'Hospitals', icon: 'fa-hospital', route: '/admin/hospitalsList', roles: ['SUPER_ADMIN'] },
    { label: 'Register Hospital', icon: 'fa-file-circle-plus', route: '/admin/register', roles: ['SUPER_ADMIN'] },
    { label: 'Doctors', icon: 'fa-user-doctor', route: '/admin/doctors-list', roles: ['HOSPITAL_ADMIN'] },
    { label: 'Add Doctor', icon: 'fa-user-plus', route: '/admin/doctors', roles: ['HOSPITAL_ADMIN'] },
    { label: 'Doctor Slots', icon: 'fa-clock', route: '/admin/doctor-slots', roles: ['HOSPITAL_ADMIN'] },
    { label: 'My Slots', icon: 'fa-clock', route: '/doctor/slots', roles: ['DOCTOR'] },
    { label: 'Appointments', icon: 'fa-calendar-check', route: '/appointment', roles: ['DOCTOR', 'HOSPITAL_ADMIN'] },
      { label: 'Patients', icon: 'fa-users', route: '/admin/patients-list', roles: ['HOSPITAL_ADMIN'] },
    { label: 'Add Patient', icon: 'fa-user-plus', route: '/admin/patient-form', roles: ['HOSPITAL_ADMIN'] },
  ];

  constructor(
    private authService: AuthService, 
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('🔵 Navbar initializing...');
    
    // First, get initial user data synchronously
    this.currentUser = this.authService.getCurrentUser();
    this.role = this.currentUser?.role || '';
    console.log('🔵 Initial navbar user from getCurrentUser():', this.currentUser);
    
    // Then subscribe to changes - this will get the latest value from ReplaySubject
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      console.log('🔄 Navbar received user update from subscription:', user);
      
      // Update component state
      this.currentUser = user;
      this.role = user?.role || '';
      
      // Force change detection
      this.cd.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  get navItems(): NavItem[] {
    return this.allNavItems.filter((item) => item.roles.includes(this.role));
  }

  get roleLabel(): string {
    const labels: { [key: string]: string } = {
      SUPER_ADMIN: 'Super Admin',
      HOSPITAL_ADMIN: 'Hospital Admin',
      DOCTOR: 'Doctor',
    };
    return labels[this.role] || this.role;
  }

  get userName(): string {
    return this.currentUser?.name || this.currentUser?.email || 'User';
  }

  get userInitial(): string {
    return this.userName.charAt(0).toUpperCase();
  }

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.collapseToggled.emit(this.collapsed);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}