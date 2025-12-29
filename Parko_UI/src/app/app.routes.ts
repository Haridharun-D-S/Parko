import { Routes } from '@angular/router';

import { LoginComponent } from './login/login.component';
import { AdminLoginComponent } from './admin-login/admin-login.component';

import { AttendantOptionsComponent } from './components/attendant-options/attendant-options.component';
import { EntryVehicleComponent } from './entry/entry-vehicle.component';
import { ExitVehicleComponent } from './exit/exit-vehicle.component';
import { AdminComponent } from './admin/admin.component';

import { AuthGuard } from './auth.guard';
import { SupervisorComponent } from './components/supervisor/supervisor.component';
import { SlotManagementComponent } from './components/slot-management/slot-management';

export const routes: Routes = [

  { path: 'login', component: LoginComponent },
  { path: 'admin-login', component: AdminLoginComponent },

  {
    path: 'attendant-options',
    component: AttendantOptionsComponent,
    canActivate: [AuthGuard],
    data: { roles: ['attendant'] }
  },

  {
    path: 'entry',
    component: EntryVehicleComponent,
    canActivate: [AuthGuard],
    data: { roles: ['attendant'] }   // 👈 MUST EXIST
  },

  {
    path: 'exit',
    component: ExitVehicleComponent,
    canActivate: [AuthGuard],
    data: { roles: ['attendant'] }   // 👈 MUST EXIST
  },
  {
    path:'slot-management',
    component: SlotManagementComponent,
    canActivate:[AuthGuard],
    data:{roles:['attendant']}
  },

  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AuthGuard],
    data: { roles: ['admin'] }
  },
  {
    path:'supervisor',
    component:SupervisorComponent,
    canActivate:[AuthGuard],
    data:{roles:['supervisor']}
  },

  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
