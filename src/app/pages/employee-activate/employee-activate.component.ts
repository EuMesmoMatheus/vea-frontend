import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service'; // Path relativo (ajuste se der erro)
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common'; // FIX: Pra *ngIf e outros
import { ReactiveFormsModule } from '@angular/forms'; // FIX: Pra formGroup e validators
import { BehaviorSubject, take } from 'rxjs';

@Component({
  selector: 'app-employee-activate',
  standalone: true, // FIX: Torna standalone pra imports locais
  imports: [
    CommonModule,      // FIX: Resolve *ngIf, *ngFor, etc.
    ReactiveFormsModule, // FIX: Resolve [formGroup], formControlName
    RouterModule       // Pra routerLink no template
  ],
  templateUrl: './employee-activate.component.html',
  styleUrls: ['./employee-activate.component.css']
})
export class EmployeeActivateComponent implements OnInit {
  activateForm: FormGroup;
  submitted = false;
  loading = false;
  error = '';
  showPassword = false;
  showConfirmPassword = false;

  // Dados do employee (pré-preenchidos)
  employeeData: any = null;
  id: number | null = null;
  token: string | null = null;

  // Critérios senha (igual ao register)
  private criteriaSubject = new BehaviorSubject<{ length: boolean; upper: boolean; lower: boolean; number: boolean; special: boolean }>({
    length: false, upper: false, lower: false, number: false, special: false
  });

  get passwordProgress(): number {
    const criteria = this.criteriaSubject.value;
    const met = Object.values(criteria).filter(Boolean).length;
    return (met / 5) * 100;
  }

  get passwordStrengthColor(): string {
    if (this.passwordProgress >= 80) return 'bg-green-500';
    if (this.passwordProgress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  get passwordCriteria() {
    return this.criteriaSubject.value;
  }

  get passwordErrors(): string | null {
    const control = this.activateForm.get('password');
    if (!control?.touched || !control.errors?.['passwordWeak']) return null;
    const error = control.errors['passwordWeak'];
    return (error as any).message || null;
  }

  get confirmPasswordErrors(): string | null {
    const control = this.activateForm.get('confirmPassword');
    if (!control?.touched || !control.errors?.['mismatch']) return null;
    return 'Senhas não coincidem.';
  }

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    // Factory pro validator de força da senha (igual register)
    const passwordStrengthValidatorFactory = (component: EmployeeActivateComponent) => {
      return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value || '';
        component.updatePasswordCriteria(value);
        if (!value) return { required: true };
        const met = Object.values(component.passwordCriteria).filter(Boolean).length;
        if (met < 5) {
          const missing = [];
          if (!component.passwordCriteria.length) missing.push('min 8 caracteres');
          if (!component.passwordCriteria.upper) missing.push('1 maiúscula (A-Z)');
          if (!component.passwordCriteria.lower) missing.push('1 minúscula (a-z)');
          if (!component.passwordCriteria.number) missing.push('1 número (0-9)');
          if (!component.passwordCriteria.special) missing.push('1 especial (!@#$%)');
          return {
            passwordWeak: {
              missing,
              message: `Senha fraca. Falta: ${missing.join(', ')}. Exemplo: Senha@123`
            }
          };
        }
        return null;
      };
    };

    this.activateForm = this.fb.group({
      name: [{ value: '', disabled: true }], // Readonly
      email: [{ value: '', disabled: true }], // Readonly
      password: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidatorFactory(this)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.id = +this.route.snapshot.paramMap.get('id')!;
    this.token = this.route.snapshot.queryParams['token'] || '';
    if (!this.id || !this.token) {
      this.error = 'Link inválido. Verifique o e-mail.';
      return;
    }
    this.loadEmployeeData();
    this.activateForm.get('password')?.valueChanges.subscribe(value => {
      this.updatePasswordCriteria(value || '');
      const control = this.activateForm.get('password');
      if (control) {
        control.markAsTouched();
        control.updateValueAndValidity({ emitEvent: false });
      }
      this.cdr.detectChanges();
    });
  }

  private loadEmployeeData(): void {
    this.loading = true;
    this.api.getActivationData(this.id!, this.token!) // Novo método do ApiService
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success && response.data) {
            this.employeeData = response.data;
            this.activateForm.patchValue({
              name: this.employeeData.name,
              email: this.employeeData.email
            });
          } else {
            this.error = response.message || 'Erro ao carregar dados. Verifique o link.';
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = err.message || 'Erro ao carregar. Solicite um novo e-mail.';
          console.error('Erro no GET activation-data:', err);
        }
      });
  }

  private updatePasswordCriteria(value: string): void {
    const newCriteria = {
      length: value.length >= 8,
      upper: /[A-Z]/.test(value),
      lower: /[a-z]/.test(value),
      number: /\d/.test(value),
      special: /[!@#$%^&*(),.?":{}<>]/.test(value)
    };
    this.criteriaSubject.next(newCriteria);
  }

  passwordMatchValidator(group: FormGroup): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    if (this.activateForm.invalid || !this.employeeData) {
      return;
    }

    const { password } = this.activateForm.value;
    this.loading = true;

    const body = {
      token: this.token!,
      password
    };

    this.api.activateEmployee(this.id!, body) // Novo método do ApiService
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.router.navigate(['/login'], { state: { message: response.message || 'Conta ativada! Faça login.' } });
          } else {
            this.error = response.message || 'Erro na ativação.';
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = err.message || 'Erro na ativação. Tente novamente.';
          console.error('Erro no POST activate:', err);
        }
      });
  }

  togglePassword(type: 'password' | 'confirmPassword'): void {
    if (type === 'password') this.showPassword = !this.showPassword;
    else this.showConfirmPassword = !this.showConfirmPassword;
    this.cdr.detectChanges();
  }
}