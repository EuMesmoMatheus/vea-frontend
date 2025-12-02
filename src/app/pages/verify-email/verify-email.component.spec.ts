import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { VerifyEmailComponent } from './verify-email.component';
import { ApiService } from '../../services/api.service';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('VerifyEmailComponent', () => {
  let component: VerifyEmailComponent;
  let fixture: ComponentFixture<VerifyEmailComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['resendVerification']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [VerifyEmailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyEmailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve ter mensagem padrão', () => {
    expect(component.message).toContain('Verifique seu e-mail');
  });

  it('deve navegar para login ao clicar em goToLogin', () => {
    component.goToLogin();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('deve reenviar email com sucesso', fakeAsync(() => {
    localStorage.setItem('user', JSON.stringify({ email: 'user@test.com' }));
    apiServiceSpy.resendVerification.and.returnValue(of({ success: true, message: 'E-mail reenviado!' }));

    component.resendEmail();
    tick();

    expect(component.loading).toBeFalse();
    expect(component.resendMessage).toContain('E-mail reenviado');
    expect(apiServiceSpy.resendVerification).toHaveBeenCalledWith('user@test.com');
  }));

  it('deve mostrar erro se usuário não encontrado', fakeAsync(() => {
    localStorage.removeItem('user');

    component.resendEmail();
    tick();

    expect(component.resendMessage).toContain('Usuário não encontrado');
    expect(apiServiceSpy.resendVerification).not.toHaveBeenCalled();
  }));

  it('deve mostrar erro se email não encontrado no user', fakeAsync(() => {
    localStorage.setItem('user', JSON.stringify({ name: 'Test' }));

    component.resendEmail();
    tick();

    expect(component.resendMessage).toContain('E-mail não encontrado');
  }));

  it('deve mostrar erro se API falhar', fakeAsync(() => {
    localStorage.setItem('user', JSON.stringify({ email: 'user@test.com' }));
    apiServiceSpy.resendVerification.and.returnValue(throwError(() => ({
      error: { message: 'Erro no servidor' }
    })));

    component.resendEmail();
    tick();

    expect(component.loading).toBeFalse();
    expect(component.resendMessage).toContain('Erro');
  }));
});
