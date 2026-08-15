import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../auth/auth-service';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const allowedRoles = route.data['roles'] as string[];
    const userRole = this.authService.getRole();

    if (!userRole) {
      this.router.navigate(['/login']);
      return false;
    }

    if (allowedRoles && allowedRoles.includes(userRole)) {
      return true;
    }

    // Redirect based on role
    if ( userRole === 'HOSPITAL_ADMIN') {
      this.router.navigate(['/admin/dashboard']);
    } else if (userRole === 'DOCTOR') {
      this.router.navigate(['/doctor/dashboard']);
    } else {
      this.router.navigate(['/']);
    }

    return false;
  }
}