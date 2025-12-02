import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { AuthService } from '@app/auth/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authService: jest.Mocked<AuthService>;
  let router: Router;
  let toastr: jest.Mocked<ToastrService>;
  let el: DebugElement;

  const mockAuthService = {
    registerCompany: jest.fn()
  };

  const mockToastr = {
    success: jest.fn(),
    error: jest.fn()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RegisterComponent,
        ReactiveFormsModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ToastrService, useValue: mockToastr },
        {
          provide: Router,
          useValue: { navigate: jest.fn() }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
    router = TestBed.inject(Router);
    toastr = TestBed.inject(ToastrService) as jest.Mocked<ToastrService>;
    el = fixture.debugElement;

    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve ter o formulário inválido quando vazio', () => {
    expect(component.form.valid).toBeFalsy();
  });

  it('deve validar campos obrigatórios', () => {
    const controls = component.form.controls;

    expect(controls['name'].hasError('required')).toBeTruthy();
    expect(controls['email'].hasError('required')).toBeTruthy();
    expect(controls['phone'].hasError('required')).toBeTruthy();
    expect(controls['password'].hasError('required')).toBeTruthy();
    expect(controls['cep'].hasError('required')).toBeTruthy();
  });

  it('deve preencher o formulário corretamente', () => {
    component.form.patchValue({
      name: 'Barbearia do Zé',
      email: 'ze@teste.com',
      phone: '11999999999',
      password: 'senha123',
      cep: '01001-000',
      logradouro: 'Praça da Sé',
      numero: '100',
      bairro: 'Centro',
      cidade: 'São Paulo',
      uf: 'SP',
      businessType: 'Barbearia',
      operatingHours: '{"startTime":"09:00","endTime":"18:00"}'
    });

    // Simula upload de logo
    const file = new File(['fake'], 'logo.png', { type: 'image/png' });
    const event = { target: { files: [file] } } as any;
    component.onLogoSelected(event);

    expect(component.form.valid).toBeTruthy();
    expect(component.logoFile).toBe(file);
  });

  it('deve cadastrar empresa com sucesso e redirecionar', fakeAsync(() => {
    // Mock da resposta do backend
    mockAuthService.registerCompany.mockReturnValue(of({
      success: true,
      message: 'Empresa cadastrada com sucesso!'
    }));

    // Preenche formulário
    component.form.patchValue({
      name: 'Salão Bela',
      email: 'bela@teste.com',
      phone: '11988887777',
      password: 'senha123',
      cep: '01001-000',
      logradouro: 'Av. Paulista',
      numero: '1000',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      uf: 'SP',
      businessType: 'Salão de Beleza',
      operatingHours: '{"startTime":"08:00","endTime":"20:00"}'
    });

    const file = new File(['fake'], 'logo.png', { type: 'image/png' });
    const event = { target: { files: [file] } } as any;
    component.onLogoSelected(event);

    // Submit
    component.onSubmit();
    tick(); // espera o async

    expect(authService.registerCompany).toHaveBeenCalled();
    expect(toastr.success).toHaveBeenCalledWith('Empresa cadastrada com sucesso!', 'Sucesso');
    expect(router.navigate).toHaveBeenCalledWith(['/confirmar-email']);
  }));

  it('deve mostrar erro se o cadastro falhar', fakeAsync(() => {
    mockAuthService.registerCompany.mockReturnValue(throwError(() => ({
      error: { message: 'E-mail já cadastrado' }
    })));

    component.form.patchValue({
      name: 'Duplicada',
      email: 'existe@teste.com',
      phone: '11999999999',
      password: '123456',
      cep: '01001-000',
      logradouro: 'Rua X',
      numero: '1',
      bairro: 'Centro',
      cidade: 'SP',
      uf: 'SP',
      businessType: 'Barbearia'
    });

    component.onSubmit();
    tick();

    expect(toastr.error).toHaveBeenCalledWith('E-mail já cadastrado', 'Erro no cadastro');
  }));

  it('deve simular upload de logo e mostrar preview', () => {
    const file = new File(['fake'], 'logo.png', { type: 'image/png' });
    const event = {
      target: { files: [file] }
    } as unknown as Event;

    component.onLogoSelected(event);

    expect(component.logoFile).toBe(file);
    expect(component.logoPreview).toContain('blob:'); // FileReader cria blob URL
  });

  it('deve limpar preview ao remover logo', () => {
    component.logoPreview = 'http://blob/fake';
    component.removeLogo();

    expect(component.logoFile).toBeNull();
    expect(component.logoPreview).toBe('');
  });
});