// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HubComponent } from './pages/hub/hub.component';
import { AdminGeneralComponent } from './pages/admin-general/admin-general.component';
import { VerifyEmailComponent } from './pages/verify-email/verify-email.component';
import { AccountActivatedComponent } from './pages/account-activated/account-activated.component';
import { ConfirmationComponent } from './pages/confirmation/confirmation.component';
import { EmployeeActivateComponent } from './pages/employee-activate/employee-activate.component';
import { AccountComponent } from './pages/account.component/account.component';
import { LandingComponent } from './components/landing/landing.component';

import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'hub', component: HubComponent, canActivate: [AuthGuard] },
  { path: 'account', component: AccountComponent, canActivate: [AuthGuard] },

  {
    path: 'admin',
    canActivate: [AdminGuard],
    children: [
      { path: 'general', component: AdminGeneralComponent },
      { path: '', redirectTo: 'general', pathMatch: 'full' }
    ]
  },

  { path: 'verify-email', component: VerifyEmailComponent },
  { path: 'confirm/:type/:id', component: ConfirmationComponent },
  { path: 'account-activated/:type', component: AccountActivatedComponent },
  { path: 'employee/activate/:id', component: EmployeeActivateComponent },

  { path: '**', redirectTo: '' }
];