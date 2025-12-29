import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { SessionService } from './session.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(
    private session: SessionService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
  const token = localStorage.getItem('auth_token');
  const role = localStorage.getItem('role');

  const allowedRoles: string[] = route.data['roles'];

  if (token && role && allowedRoles.includes(role.toLowerCase())) {
    return true;
  }

  this.router.navigate(['/login']);
  return false;
}


}
