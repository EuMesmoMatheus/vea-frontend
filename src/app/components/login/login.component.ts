import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { timeout } from 'rxjs/operators';

/**
 * Componente de Login para autenticação de usuários.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush, // Otimiza CD, evita loops
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, AfterViewInit {
  loginForm: FormGroup;
  submitted = false;
  loading = false;
  initialLoading = true; // Flag pro loading inicial da tela
  error = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toast: ToastService
  ) {
    console.log('Constructor rodando - initialLoading:', this.initialLoading); // <<< DEBUG: Confirma init
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit(): void {
    console.log('ngOnInit rodando'); // <<< DEBUG: Vê se init roda
    this.loginForm.statusChanges.subscribe(() => {
      this.cdr.markForCheck(); // Marca pra CD no OnPush
    });
  }

  ngAfterViewInit(): void {
    console.log('ngAfterViewInit rodando - Vai esconder loading!'); // <<< DEBUG: Confirma se chega aqui
    // FIX: Usa setTimeout pra forçar um ciclo assíncrono e update do *ngIf (resolve loops em OnPush)
    // LONGO: 2500ms pra dar tempo de apreciar o loading kkk
    setTimeout(() => {
      this.initialLoading = false;
      console.log('initialLoading setado pra false!'); // <<< DEBUG: Confirma mudança
      this.cdr.detectChanges(); // <<< MUDEI: detectChanges() em vez de markForCheck() pra forçar render imediato
    }, 2500); // 2.5 segundos - ajusta aqui se quiser mais/menos
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    if (this.loginForm.invalid) {
      // Trim email para evitar espaços (melhoria de segurança)
      const emailControl = this.loginForm.get('email');
      if (emailControl) {
        emailControl.setValue(emailControl.value.trim());
      }
      this.cdr.detectChanges(); // Force render errors
      return;
    }
    this.loading = true;
    const { email, password } = this.loginForm.value;
    console.log('Iniciando login com:', { email }); // NOVO: Confirma submit
    this.api.login(email, password)
      .pipe(timeout(10000))
      .subscribe({
        next: (response: any) => {
          console.log('Subscribe.next rodando - Response completa:', response); // NOVO: Confirma next
          console.log('Response.data detalhado:', response.data); // <<< NOVO: Log específico do data (vazio?)
          console.log('Response.token existe?', !!response.token); // <<< NOVO: Checa token
          console.log('Response.user existe?', !!response.user); // <<< NOVO: Checa user
          if (response.success && response.data && response.data.token && response.data.user) { // <<< FIX: Checa response.data explicitamente (backend retorna Data = { token, user })
            const { token, user } = response.data; // <<< Extrai de data
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            if (user.companyId) { // NOVO: Set companyId pro admin-general
              localStorage.setItem('companyId', user.companyId.toString());
            }
            console.log('Storage setado - User parsed:', JSON.parse(localStorage.getItem('user') || '{}')); // NOVO: Verifica storage
          } else {
            console.warn('Response inválido: Sem token/user. Checa backend.'); // <<< NOVO: Avisa se data vazio
            this.error = 'Erro no server: Resposta incompleta. Verifique se a conta está ativa.'; // <<< Custom error pra data vazio
            this.loading = false;
            this.cdr.detectChanges();
            return; // Para aqui se inválido
          }
          this.resetForm();
          this.toast.success('Login realizado com sucesso! 👋');
          const role = response.data.user?.role || 'Client'; // <<< Extrai role de data.user
          console.log('Role extraída - Vai chamar redirect com:', role); // NOVO: Pré-redirect
          this.redirectBasedOnRole(role);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Subscribe.error rodando:', err); // NOVO: Se next não roda
          this.error = err.error?.message || 'Credenciais inválidas ou conta inativa. Verifique o e-mail de confirmação.';
          this.toast.error('Falha no login. Verifique suas credenciais. ❌');
          console.error('Login error:', err);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
    this.cdr.detectChanges(); // Update input type
  }

  private redirectBasedOnRole(role: string): void {
    console.log('redirectBasedOnRole ENTRADA - Role recebida:', role); // NOVO: Confirma chamada
    switch (role) {
      case 'Admin':
        console.log('Case Admin ativado - Iniciando navigate pra /admin/general'); // NOVO: Log case
        this.router.navigate(['/admin/general']).then((success) => { // FIX: Rota pra /admin/general
          console.log('Navigate Promise resolvida - Sucesso?', success); // NOVO: Resultado
          if (success) {
            console.log('Redirecionamento OK - URL atual:', this.router.url);
          } else {
            console.error('Navigate falhou - Verifique routes/guards');
          }
          this.cdr.detectChanges(); // NOVO: Force CD pós-nav
        }).catch((err) => {
          console.error('Navigate erro na Promise:', err); // NOVO: Catch
        });
        break;
      case 'Employee':
        console.log('Case Employee - Navegando pra /employee/dashboard');
        this.router.navigate(['/employee/dashboard']);
        break;
      case 'Client':
        console.log('Case Client - Navegando pra /hub');
        this.router.navigate(['/hub']);
        break;
      default:
        console.log('Default case - Navegando pra /hub');
        this.router.navigate(['/hub']);
    }
    console.log('redirectBasedOnRole SAÍDA - Switch executado'); // NOVO: Confirma fim
  }

  private resetForm(): void {
    this.loginForm.reset();
    this.submitted = false;
    this.showPassword = false;
  }
} 