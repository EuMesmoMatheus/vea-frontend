import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { take } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';

/**
 * Componente de Cadastro VEA: Validação visual real-time da senha (front-only).
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  submitted = false;
  loading = false;
  error = '';
  cepError = ''; // Erro específico do CEP
  type: 'client' | 'company' = 'client';
  showPassword = false;

  // Critérios visual da senha (atualiza simultâneo ao digitar) - via Subject para reatividade
  private criteriaSubject = new BehaviorSubject<{ length: boolean; upper: boolean; lower: boolean; number: boolean; special: boolean }>({
    length: false, upper: false, lower: false, number: false, special: false
  });
  public passwordCriteria$ = this.criteriaSubject.asObservable();

  // Validity form (sync, sem async lag)
  private validitySubject = new BehaviorSubject<boolean>(false);
  public isFormValid$ = this.validitySubject.asObservable();

  get isFormValid(): boolean {
    const status = this.registerForm.status;
    const valid = status === 'VALID';
    this.validitySubject.next(valid);
    return valid;
  }

  // Progress visual senha (0-100%) - usa subject
  get passwordProgress(): number {
    const criteria = this.criteriaSubject.value;
    const met = Object.values(criteria).filter(Boolean).length;
    return (met / 5) * 100;
  }

  // Cor barra visual
  get passwordStrengthColor(): string {
    if (this.passwordProgress >= 80) return 'bg-green-500';
    if (this.passwordProgress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  // Erro senha (real-time com touched)
  get passwordErrors(): string | null {
    const control = this.registerForm.get('password');
    if (!control?.touched || !control.errors?.['passwordWeak']) return null;
    const error = control.errors['passwordWeak'];
    return (error as any).message || null;
  }

  // Getter para criteria (sync do subject)
  get passwordCriteria() {
    return this.criteriaSubject.value;
  }

  // Business types
  businessTypes = [
    { value: 'Barbearia', label: 'Barbearia' },
    { value: 'Estética', label: 'Estética' },
    { value: 'Manicure', label: 'Manicure' },
    { value: 'Centro de Psicologia', label: 'Centro de Psicologia' },
    { value: 'Clínica Médica', label: 'Clínica Médica' },
    { value: 'Salão de Beleza', label: 'Salão de Beleza' },
    { value: 'Auto Escola', label: 'Auto Escola' }
  ];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef // Force update visual senha
  ) {
    // Init criteria
    this.criteriaSubject.next({ length: false, upper: false, lower: false, number: false, special: false });

    // Factory pro validator: captura 'this' do componente
    const passwordStrengthValidatorFactory = (component: RegisterComponent) => {
      return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value || '';
        component.updatePasswordCriteria(value); // Agora 'this' é capturado via closure
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

    // Validator trim para e-mail
    const trimValidator = (control: AbstractControl): ValidationErrors | null => {
      if (control.value && typeof control.value === 'string') {
        const trimmed = control.value.trim();
        if (trimmed !== control.value) {
          control.setValue(trimmed, { emitEvent: false });
        }
      }
      return null;
    };

    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email, trimValidator]], // Adicionado trimValidator
      phone: ['', [Validators.required, Validators.pattern(/^\(\d{2}\) \d{5}-\d{4}$/)]],
      password: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidatorFactory(this)]],  // Use factory aqui
      // Campos de endereço (substitui 'location')
      cep: [''],
      logradouro: [''],
      numero: [''],
      complemento: [''],
      bairro: [''],
      cidade: [''],
      uf: [''],
      startTime: [''],
      endTime: [''],
      logo: [null as File | null, []],
      coverImage: [null as File | null, []],
      businessType: ['']
    });
  }

  ngOnInit(): void {
    this.registerForm.statusChanges.subscribe(() => {
      this.isFormValid;
    });

    // Init subject
    this.criteriaSubject.next({ length: false, upper: false, lower: false, number: false, special: false });

    // Simultâneo: ValueChanges pra update visual senha
    this.registerForm.get('password')?.valueChanges.subscribe(value => {
      this.updatePasswordCriteria(value || '');
      const control = this.registerForm.get('password');
      if (control) {
        control.markAsTouched(); // Pra erros visuais real-time
        control.updateValueAndValidity({ emitEvent: false }); // Evita loop
      }
      this.isFormValid;
      this.cdr.detectChanges(); // Force visual update (barra/checks)
    });
  }

  // Update critérios visual (simultâneo ao digitar) - next no subject
  private updatePasswordCriteria(value: string): void {
    const newCriteria = {
      length: value.length >= 8,
      upper: /[A-Z]/.test(value),
      lower: /[a-z]/.test(value),
      number: /\d/.test(value),
      special: /[!@#$%^&*(),.?":{}<>]/.test(value)
    };
    this.criteriaSubject.next(newCriteria); // Broadcast novo objeto pra reatividade
  }

  // File validator (front-only)
  fileValidator(maxSizeMB: number = 5): (control: AbstractControl) => ValidationErrors | null {
    return (control: AbstractControl): ValidationErrors | null => {
      const file = control.value as File;
      if (!file) return { required: true };
      if (file.size > maxSizeMB * 1024 * 1024) return { fileTooLarge: true };
      return null;
    };
  }

  // Máscara CEP (similar ao phone)
  formatCep(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 5) {
      value = value.replace(/(\d{5})(\d{1,3})/, '$1-$2');
    }
    input.value = value;
    this.registerForm.get('cep')?.setValue(value, { emitEvent: true });
    this.registerForm.get('cep')?.updateValueAndValidity();
  }

  // Busca CEP via ViaCEP (no blur)
  async buscarCep(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const cep = input.value.replace(/\D/g, '');
    this.cepError = '';
    if (cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        this.registerForm.patchValue({
          logradouro: data.logradouro || '',
          complemento: data.complemento || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          uf: data.uf || ''
        });
        this.cepError = '';
      } else {
        this.cepError = 'CEP não encontrado. Preencha os campos manualmente.';
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      this.cepError = 'Erro na busca. Tente novamente.';
    }
    this.cdr.detectChanges(); // Update UI
  }

  // Máscara phone
  formatPhone(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    input.value = value;
    this.registerForm.get('phone')?.setValue(value, { emitEvent: true });
    this.registerForm.get('phone')?.updateValueAndValidity();
  }

  // File change
  onFileChange(event: Event, field: 'logo' | 'coverImage'): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.registerForm.patchValue({ [field]: file }, { emitEvent: false });
      const control = this.registerForm.get(field);
      if (this.type === 'company' && field === 'logo') {
        control?.setValidators([this.fileValidator()]);
      }
      control?.updateValueAndValidity();
    } else {
      this.registerForm.patchValue({ [field]: null }, { emitEvent: false });
      this.registerForm.get(field)?.updateValueAndValidity();
    }
    this.registerForm.get(field)?.markAsTouched();
  }

  // Toggle type
  onTypeChange(index: number): void {
    this.type = index === 0 ? 'client' : 'company';

    const cepControl = this.registerForm.controls['cep'];
    const logradouroControl = this.registerForm.controls['logradouro'];
    const numeroControl = this.registerForm.controls['numero'];
    const complementoControl = this.registerForm.controls['complemento'];
    const bairroControl = this.registerForm.controls['bairro'];
    const cidadeControl = this.registerForm.controls['cidade'];
    const ufControl = this.registerForm.controls['uf'];
    const startTimeControl = this.registerForm.controls['startTime'];
    const endTimeControl = this.registerForm.controls['endTime'];
    const logoControl = this.registerForm.controls['logo'];
    const businessTypeControl = this.registerForm.controls['businessType'];
   
    if (this.type === 'company') {
      // Validators pros campos de endereço
      cepControl.setValidators([Validators.required, Validators.pattern(/^\d{5}-\d{3}$/)]);
      logradouroControl.setValidators([Validators.required]);
      numeroControl.setValidators([Validators.required]);
      bairroControl.setValidators([Validators.required]);
      cidadeControl.setValidators([Validators.required]);
      ufControl.setValidators([Validators.required, Validators.pattern(/^[A-Z]{2}$/)]);
      // Outros
      startTimeControl.setValidators([Validators.required]);
      endTimeControl.setValidators([Validators.required]);
      logoControl.setValidators([this.fileValidator()]);
      businessTypeControl.setValidators([Validators.required]);
      // Clear fields on switch to company
      this.registerForm.patchValue({
        cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
        startTime: '', endTime: '', businessType: '', logo: null, coverImage: null
      });
    } else {
      // Clear validators pra client
      cepControl.clearValidators();
      logradouroControl.clearValidators();
      numeroControl.clearValidators();
      complementoControl.clearValidators();
      bairroControl.clearValidators();
      cidadeControl.clearValidators();
      ufControl.clearValidators();
      startTimeControl.clearValidators();
      endTimeControl.clearValidators();
      logoControl.clearValidators();
      businessTypeControl.clearValidators();
    }
   
    [cepControl, logradouroControl, numeroControl, complementoControl, bairroControl, cidadeControl, ufControl,
     startTimeControl, endTimeControl, logoControl, businessTypeControl].forEach(control => {
      control.markAsTouched();
      control.updateValueAndValidity();
    });
   
    this.registerForm.updateValueAndValidity({ emitEvent: false });
    this.isFormValid;
   
    // Force view update for *ngIf bindings on type
    this.cdr.detectChanges();
  }

  // Submit (email check no submit, visual errors)
  onSubmit(): void {
    this.submitted = true;
    this.registerForm.markAllAsTouched();
    this.error = '';
    this.cepError = '';

    // Check horário visual
    const startTime = this.registerForm.get('startTime')?.value;
    const endTime = this.registerForm.get('endTime')?.value;
    if (this.type === 'company' && startTime && endTime && new Date(`2000-01-01T${startTime}`) >= new Date(`2000-01-01T${endTime}`)) {
      this.error = 'Horário inválido: fim deve ser após o início.';
      return;
    }

    if (!this.isFormValid) {
      return;
    }

    // Email check (API, visual error)
    const email = this.registerForm.get('email')?.value;
    if (email) {
      this.loading = true;
      this.api.checkEmailExists(email)
        .pipe(take(1))
        .subscribe({
          next: (response: any) => {
            this.loading = false;
            console.log('API Response checkEmail:', response, 'Data exists?', !!response?.data); // EXPANDIDO: Log completo + check booleano
            if (response?.data) {
              this.error = 'E-mail já cadastrado no sistema.';
              const emailControl = this.registerForm.get('email');
              emailControl?.setErrors({ emailExists: true });
              emailControl?.markAsTouched();
              return;
            }
            this.proceedWithRegistration(startTime, endTime);
          },
          error: (err) => {
            this.loading = false;
            this.error = 'Erro ao verificar e-mail. Tente novamente.';
            console.error('Erro check email:', err);
          }
        });
    } else {
      this.proceedWithRegistration(startTime, endTime);
    }
  }

  // Proceed (envia API)
  private proceedWithRegistration(startTime?: string, endTime?: string): void {
    const formValue = this.registerForm.value;

    if (this.type === 'client') {
      const clientData = {
        name: formValue.name || '',
        email: formValue.email || '',
        phone: formValue.phone || '',
        password: formValue.password || ''  // <<< FIX: Envia como "password" (plain text, pro DTO)
      };
      console.log('Enviando registro para client:', clientData);  // Log pra debug (remove depois)
      const endpoint = 'auth/register/client';
      this.loading = true;
      this.api.register(endpoint, clientData)
        .pipe(take(1))
        .subscribe({
          next: (response) => {
            this.loading = false;
            localStorage.setItem('user', JSON.stringify(response.user || response));
            this.resetForm();
            this.router.navigate(['/verify-email'], { state: { message: response.message || 'Verifique seu e-mail!' } });
          },
          error: (err) => {
            this.loading = false;
            this.error = err.error?.Message || err.error?.message || 'Erro no cadastro.';  // <<< FIX: Tenta Message ou message
            console.error('Erro register:', err);
          }
        });
    } else {
      // Formato: "HH:MM-HH:MM" (ex: "09:00-18:00")
      const operatingHours = startTime && endTime ? `${startTime}-${endTime}` : '';
      const userData = new FormData();
      userData.append('name', formValue.name || '');
      userData.append('email', formValue.email || '');
      userData.append('phone', formValue.phone || '');
      userData.append('password', formValue.password || '');  // <<< FIX: "password" (plain)
      // Endereço separado (pra filtros top)
      userData.append('cep', formValue.cep || '');
      userData.append('logradouro', formValue.logradouro || '');
      userData.append('numero', formValue.numero || '');
      userData.append('complemento', formValue.complemento || '');
      userData.append('bairro', formValue.bairro || '');
      userData.append('cidade', formValue.cidade || '');
      userData.append('uf', formValue.uf || '');
      userData.append('operatingHours', operatingHours);
      userData.append('businessType', formValue.businessType || '');
      if (formValue.logo) userData.append('logo', formValue.logo as File);
      if (formValue.coverImage) userData.append('coverImage', formValue.coverImage as File);

      const endpoint = 'auth/register/company';
      this.loading = true;
      this.api.register(endpoint, userData)
        .pipe(take(1))
        .subscribe({
          next: (response) => {
            this.loading = false;
            localStorage.setItem('user', JSON.stringify(response.user || response));
            this.resetForm();
            this.router.navigate(['/verify-email'], { state: { message: response.message || 'Verifique seu e-mail!' } });
          },
          error: (err) => {
            this.loading = false;
            this.error = err.error?.Message || err.error?.message || 'Erro no cadastro.';  // <<< FIX: Tenta Message ou message
            console.error('Erro register:', err);
          }
        });
    }
  }

  // Reset (limpa visual)
  private resetForm(): void {
    this.registerForm.reset();
    this.submitted = false;
    this.cepError = '';
    this.registerForm.patchValue({
      logo: null,
      coverImage: null,
      businessType: ''
    });
    this.criteriaSubject.next({ length: false, upper: false, lower: false, number: false, special: false });
    this.isFormValid;
  }
}