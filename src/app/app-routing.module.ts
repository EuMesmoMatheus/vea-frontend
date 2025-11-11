import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HubComponent } from './pages/hub/hub.component';
import { AdminGeneralComponent } from './pages/admin-general/admin-general.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { VerifyEmailComponent } from './pages/verify-email/verify-email.component';
import { AccountActivatedComponent } from './pages/account-activated/account-activated.component';
import { ConfirmationComponent } from './pages/confirmation/confirmation.component';
import { EmployeeActivateComponent } from './pages/employee-activate/employee-activate.component'; // Import do componente de ativação
import { AccountComponent } from './pages/account.component/account.component'; // Import do componente de ativação


// NOVO: Import da Landing
import { LandingComponent } from './components/landing/landing.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'hub', component: HubComponent, canActivate: [AuthGuard] },
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
  // Rota para ativação de funcionário (anônima, sem guards)
  { path: 'employee/activate/:id', component: EmployeeActivateComponent },
  { path: 'account', component: AccountComponent },
  
  // MUDANÇA: Rota raiz agora carrega a Landing (pública, sem guard)
  { path: '', component: LandingComponent },
  
  // Fallback: Qualquer rota inválida vai pro login (mantém o ** no final)
  // { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }