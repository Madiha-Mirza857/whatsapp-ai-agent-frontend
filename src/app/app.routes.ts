import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { Auth } from './auth/auth';
import { HospitalsList } from './Hospitals/hospitals-list/hospitals-list';
import { HospitalRegistration } from './Hospitals/hospital-registration/hospital-registration';
import { AdminDashboard } from './admin/admin-dashboard/admin-dashboard';
import { Doctors } from './DoctorsModule/doctors/doctors';
import { DoctorsList } from './DoctorsModule/doctors-list/doctors-list';
import { DoctorDashboard } from './doctor/doctor-dashboard/doctor-dashboard';
import { DoctorSlotComponent } from './DoctorSlot/doctor-slot/doctor-slot';
import { AppointmentComponent } from './appointment/appointment-component/appointment-component';


export const routes: Routes = [
  // Public Routes
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Auth },

  // Admin Routes (HOSPITAL_ADMIN & SUPER_ADMIN only)
  {
  path: 'admin',
  canActivate: [AuthGuard, RoleGuard],
  data: { roles: ['HOSPITAL_ADMIN', 'SUPER_ADMIN'] },
  children: [
    { path: 'dashboard', component: AdminDashboard, data: { roles: ['HOSPITAL_ADMIN'] } },
    { path: 'doctors', component: Doctors, data: { roles: ['HOSPITAL_ADMIN'] } },
    { path: 'doctors-list', component: DoctorsList, data: { roles: ['HOSPITAL_ADMIN'] } },
    { path: 'doctor-slots', component: DoctorSlotComponent, data: { roles: ['HOSPITAL_ADMIN'] } },
    { path: 'register', component: HospitalRegistration, data: { roles: ['SUPER_ADMIN'] } },
    { path: 'register/:id', component: HospitalRegistration, data: { roles: ['SUPER_ADMIN'] } },
    { path: 'hospitalsList', component: HospitalsList, data: { roles: ['SUPER_ADMIN'] } },
  ],
},
   {
    path: 'admin',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['SUPER_ADMIN'] },
    children: [
       { path: 'register', component: HospitalRegistration },
      { path: 'register/:id', component: HospitalRegistration },
      { path: 'hospitalsList', component: HospitalsList },

    ],
  },
  
  // Doctor Routes (DOCTOR only)
  {
    path: 'doctor',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['DOCTOR'] },
    children: [
      { path: 'dashboard', component: DoctorDashboard },
      { path: 'slots', component: DoctorSlotComponent },
  
    ],
  },

  {path:"appointment",component:AppointmentComponent, canActivate: [AuthGuard, RoleGuard],data: { roles: ['DOCTOR','HOSPITAL_ADMIN']}},

  // Redirect to appropriate dashboard
  { path: 'dashboard', redirectTo: '/admin/dashboard', pathMatch: 'full' },
];