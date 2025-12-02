import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['register', 'checkEmailExists']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve ter o formulário inválido quando vazio', () => {
    expect(component.registerForm.valid).toBeFalsy();
  });

  it('deve validar campos obrigatórios', () => {
    const controls = component.registerForm.controls;
    
    expect(controls['name'].hasError('required')).toBeTruthy();
    expect(controls['email'].hasError('required')).toBeTruthy();
    expect(controls['phone'].hasError('required')).toBeTruthy();
    expect(controls['password'].hasError('required')).toBeTruthy();
  });

  it('deve validar formato de email', () => {
    const emailControl = component.registerForm.get('email');
    
    emailControl?.setValue('invalid');
    expect(emailControl?.hasError('email')).toBeTruthy();
    
    emailControl?.setValue('valid@email.com');
    expect(emailControl?.hasError('email')).toBeFalsy();
  });

  it('deve validar formato de telefone', () => {
    const phoneControl = component.registerForm.get('phone');
    
    phoneControl?.setValue('123');
    expect(phoneControl?.hasError('pattern')).toBeTruthy();
    
    phoneControl?.setValue('(11) 99999-9999');
    expect(phoneControl?.hasError('pattern')).toBeFalsy();
  });

  it('deve atualizar critérios de senha ao digitar', () => {
    const passwordControl = component.registerForm.get('password');
    
    passwordControl?.setValue('abc');
    expect(component.passwordCriteria.length).toBeFalsy();
    expect(component.passwordCriteria.lower).toBeTruthy();
    
    passwordControl?.setValue('Abc12345!');
    expect(component.passwordCriteria.length).toBeTruthy();
    expect(component.passwordCriteria.upper).toBeTruthy();
    expect(component.passwordCriteria.lower).toBeTruthy();
    expect(component.passwordCriteria.number).toBeTruthy();
    expect(component.passwordCriteria.special).toBeTruthy();
  });

  it('deve trocar tipo de cadastro entre client e company', () => {
    expect(component.type).toBe('client');
    
    component.onTypeChange(1);
    expect(component.type).toBe('company');
    
    component.onTypeChange(0);
    expect(component.type).toBe('client');
  });

  it('deve validar campos de endereço quando tipo é company', () => {
    component.onTypeChange(1);
    
    const cepControl = component.registerForm.get('cep');
    const logradouroControl = component.registerForm.get('logradouro');
    
    expect(cepControl?.hasError('required')).toBeTruthy();
    expect(logradouroControl?.hasError('required')).toBeTruthy();
  });

  it('deve cadastrar cliente com sucesso', fakeAsync(() => {
    apiServiceSpy.checkEmailExists.and.returnValue(of(false as any));
    apiServiceSpy.register.and.returnValue(of({
      success: true,
      user: { id: 1, name: 'Teste', email: 'teste@email.com' },
      message: 'Cadastro realizado!'
    }));

    component.registerForm.patchValue({
      name: 'Teste',
      email: 'teste@email.com',
      phone: '(11) 99999-9999',
      password: 'Senha@123'
    });

    component.onSubmit();
    tick();

    expect(apiServiceSpy.register).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/verify-email'], jasmine.any(Object));
  }));

  it('deve mostrar erro se email já existe', fakeAsync(() => {
    apiServiceSpy.checkEmailExists.and.returnValue(of(true as any));

    component.registerForm.patchValue({
      name: 'Teste',
      email: 'existe@email.com',
      phone: '(11) 99999-9999',
      password: 'Senha@123'
    });

    component.onSubmit();
    tick();

    expect(component.error).toContain('E-mail já cadastrado');
    expect(apiServiceSpy.register).not.toHaveBeenCalled();
  }));

  it('deve formatar CEP corretamente', () => {
    const event = { target: { value: '01001000' } } as unknown as Event;
    component.formatCep(event);
    
    expect(component.registerForm.get('cep')?.value).toBe('01001-000');
  });

  it('deve formatar telefone corretamente', () => {
    const event = { target: { value: '11999999999' } } as unknown as Event;
    component.formatPhone(event);
    
    expect(component.registerForm.get('phone')?.value).toBe('(11) 99999-9999');
  });

  it('deve calcular progresso da senha corretamente', () => {
    component.registerForm.get('password')?.setValue('');
    expect(component.passwordProgress).toBe(0);
    
    component.registerForm.get('password')?.setValue('Senha@123');
    expect(component.passwordProgress).toBe(100);
  });

  it('deve retornar cor correta baseada no progresso da senha', () => {
    component.registerForm.get('password')?.setValue('a');
    expect(component.passwordStrengthColor).toBe('bg-red-500');
    
    component.registerForm.get('password')?.setValue('Abc123');
    expect(component.passwordStrengthColor).toBe('bg-yellow-500');
    
    component.registerForm.get('password')?.setValue('Senha@123');
    expect(component.passwordStrengthColor).toBe('bg-green-500');
  });
});
