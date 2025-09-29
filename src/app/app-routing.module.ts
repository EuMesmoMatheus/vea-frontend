import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HubComponent } from './pages/hub/hub.component';
import { DashboardAdminComponent } from './pages/dashboard-admin/dashboard-admin.component';
import { EmployeesComponent } from './pages/employees/employees.component';
import { ServicesComponent } from './pages/services/services.component';
import { AppointmentsComponent } from './pages/appointments/appointments.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'hub', component: HubComponent, canActivate: [AuthGuard] },
  { path: 'dashboard-admin', component: DashboardAdminComponent, canActivate: [AdminGuard] },
  { path: 'employees', component: EmployeesComponent, canActivate: [AdminGuard] },
  { path: 'services', component: ServicesComponent, canActivate: [AdminGuard] },
  { path: 'appointments', component: AppointmentsComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: '/hub', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }