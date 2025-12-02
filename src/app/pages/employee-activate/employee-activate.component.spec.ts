import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EmployeeActivateComponent } from './employee-activate.component';
import { ApiService } from '../../services/api.service';
import { Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('EmployeeActivateComponent', () => {
  let component: EmployeeActivateComponent;
  let fixture: ComponentFixture<EmployeeActivateComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockActivatedRoute = {
    snapshot: {
      paramMap: convertToParamMap({ id: '1' }),
      queryParams: { token: 'valid-token-123' }
    }
  };

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getActivationData', 'activateEmployee']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    apiServiceSpy.getActivationData.and.returnValue(of({
      success: true,
      data: { id: 1, name: 'João Silva', email: 'joao@test.com' }
    }));

    await TestBed.configureTestingModule({
      imports: [EmployeeActivateComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeActivateComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('deve carregar dados do funcionário', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(apiServiceSpy.getActivationData).toHaveBeenCalledWith(1, 'valid-token-123');
    expect(component.activateForm.get('name')?.value).toBe('João Silva');
    expect(component.activateForm.get('email')?.value).toBe('joao@test.com');
  }));

  it('deve mostrar erro se link for inválido', async () => {
    // Este teste precisa de um novo TestBed
    await TestBed.resetTestingModule();
    
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getActivationData', 'activateEmployee']);
    
    await TestBed.configureTestingModule({
      imports: [EmployeeActivateComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: {
          snapshot: {
            paramMap: convertToParamMap({}),
            queryParams: {}
          }
        }}
      ]
    }).compileComponents();

    const newFixture = TestBed.createComponent(EmployeeActivateComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();

    expect(newComponent.error).toContain('Link inválido');
  });

  it('deve atualizar critérios de senha', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const passwordControl = component.activateForm.get('password');
    
    passwordControl?.setValue('abc');
    tick();
    expect(component.passwordCriteria.length).toBeFalse();
    expect(component.passwordCriteria.lower).toBeTrue();

    passwordControl?.setValue('Abc12345!');
    tick();
    expect(component.passwordCriteria.length).toBeTrue();
    expect(component.passwordCriteria.upper).toBeTrue();
    expect(component.passwordCriteria.lower).toBeTrue();
    expect(component.passwordCriteria.number).toBeTrue();
    expect(component.passwordCriteria.special).toBeTrue();
  }));

  it('deve calcular progresso da senha', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.activateForm.get('password')?.setValue('');
    tick();
    expect(component.passwordProgress).toBe(0);

    component.activateForm.get('password')?.setValue('Senha@123');
    tick();
    expect(component.passwordProgress).toBe(100);
  }));

  it('deve validar senhas iguais', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.activateForm.get('password')?.setValue('Senha@123');
    component.activateForm.get('confirmPassword')?.setValue('Diferente');
    tick();

    expect(component.activateForm.hasError('mismatch')).toBeTrue();

    component.activateForm.get('confirmPassword')?.setValue('Senha@123');
    tick();

    expect(component.activateForm.hasError('mismatch')).toBeFalse();
  }));

  it('deve ativar funcionário com sucesso', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    apiServiceSpy.activateEmployee.and.returnValue(of({
      success: true,
      message: 'Conta ativada com sucesso!'
    }));

    component.activateForm.get('password')?.setValue('Senha@123');
    component.activateForm.get('confirmPassword')?.setValue('Senha@123');
    tick();

    component.onSubmit();
    tick();

    expect(apiServiceSpy.activateEmployee).toHaveBeenCalledWith(1, {
      token: 'valid-token-123',
      password: 'Senha@123'
    });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], jasmine.any(Object));
  }));

  it('deve mostrar erro se ativação falhar', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    apiServiceSpy.activateEmployee.and.returnValue(throwError(() => ({
      message: 'Token expirado'
    })));

    component.activateForm.get('password')?.setValue('Senha@123');
    component.activateForm.get('confirmPassword')?.setValue('Senha@123');
    tick();

    component.onSubmit();
    tick();

    expect(component.error).toContain('Token expirado');
    expect(component.loading).toBeFalse();
  }));

  it('deve toggle visibilidade da senha', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.showPassword).toBeFalse();
    
    component.togglePassword('password');
    expect(component.showPassword).toBeTrue();

    component.togglePassword('confirmPassword');
    expect(component.showConfirmPassword).toBeTrue();
  }));
});
