import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { SessionService } from './session.service';
import { ActivatedRouteSnapshot } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private session: SessionService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
  const token = localStorage.getItem('auth_token');
  const role = localStorage.getItem('role');

  if (!token || !role) {
    this.router.navigate(['/login']);
    return false;
  }

  const allowedRoles: string[] | undefined = route.data['roles'];

  if (
  !allowedRoles ||
  allowedRoles.map(r => r.toLowerCase()).includes(role.toLowerCase())
) {
  return true;
  console.log('GUARD PATH:', route.routeConfig?.path);
console.log('GUARD ROLES:', route.data['roles']);
  
}



  this.router.navigate(['/login']);
  return false;
}



}
