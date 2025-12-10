import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['login']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve ter o formulário inválido quando vazio', () => {
    expect(component.loginForm.valid).toBeFalsy();
  });

  it('deve validar email como obrigatório', () => {
    const emailControl = component.loginForm.get('email');
    expect(emailControl?.hasError('required')).toBeTruthy();
  });

  it('deve validar formato de email', () => {
    const emailControl = component.loginForm.get('email');
    emailControl?.setValue('invalid');
    expect(emailControl?.hasError('email')).toBeTruthy();

    emailControl?.setValue('valid@email.com');
    expect(emailControl?.hasError('email')).toBeFalsy();
  });

  it('deve validar senha com mínimo de 8 caracteres', () => {
    const passwordControl = component.loginForm.get('password');
    passwordControl?.setValue('123');
    expect(passwordControl?.hasError('minlength')).toBeTruthy();

    passwordControl?.setValue('12345678');
    expect(passwordControl?.hasError('minlength')).toBeFalsy();
  });

  it('deve fazer login com sucesso e redirecionar para Admin', fakeAsync(() => {
    const mockResponse = {
      success: true,
      user: { id: 1, name: 'Admin', email: 'admin@teste.com', role: 'Admin', companyId: 5 },
      message: 'Login realizado',
      token: 'fake-jwt-token',
      data: {
        token: 'fake-jwt-token',
        user: { id: 1, name: 'Admin', email: 'admin@teste.com', role: 'Admin', companyId: 5 }
      }
    } as any;
    apiServiceSpy.login.and.returnValue(of(mockResponse));

    component.loginForm.setValue({
      email: 'admin@teste.com',
      password: '12345678'
    });

    component.onSubmit();
    tick();

    expect(apiServiceSpy.login).toHaveBeenCalledWith('admin@teste.com', '12345678');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/general']);
  }));

  it('deve fazer login com sucesso e redirecionar para Client', fakeAsync(() => {
    const mockResponse = {
      success: true,
      user: { id: 2, name: 'Cliente', email: 'cliente@teste.com', role: 'Client' },
      message: 'Login realizado',
      token: 'fake-jwt-token',
      data: {
        token: 'fake-jwt-token',
        user: { id: 2, name: 'Cliente', email: 'cliente@teste.com', role: 'Client' }
      }
    } as any;
    apiServiceSpy.login.and.returnValue(of(mockResponse));

    component.loginForm.setValue({
      email: 'cliente@teste.com',
      password: '12345678'
    });

    component.onSubmit();
    tick();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/hub']);
  }));

  it('deve mostrar erro com credenciais inválidas', fakeAsync(() => {
    apiServiceSpy.login.and.returnValue(throwError(() => ({
      error: { message: 'Credenciais inválidas' }
    })));

    component.loginForm.setValue({
      email: 'errado@teste.com',
      password: 'senhaerrada'
    });

    component.onSubmit();
    tick();

    expect(component.error).toContain('Credenciais inválidas');
    expect(component.loading).toBeFalsy();
  }));

  it('deve alternar visibilidade da senha', () => {
    expect(component.showPassword).toBeFalsy();
    
    component.togglePassword();
    expect(component.showPassword).toBeTruthy();
    
    component.togglePassword();
    expect(component.showPassword).toBeFalsy();
  });

  it('não deve submeter formulário inválido', () => {
    component.loginForm.setValue({
      email: 'invalid',
      password: '123'
    });

    component.onSubmit();

    expect(apiServiceSpy.login).not.toHaveBeenCalled();
  });
});
