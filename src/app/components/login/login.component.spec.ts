import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '@app/auth/auth.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { mockProviders } from 'test/utils/mock-providers';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jest.Mocked<AuthService>;
  let router: Router;

  const mockAuthService = {
    login: jest.fn(),
    isLoggedIn$: of(false)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent, ...mockProviders],
      providers: [
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve fazer login com sucesso e redirecionar', () => {
    const navigateSpy = jest.spyOn(router, 'navigate');

    authService.login.mockReturnValue(of({
      token: 'fake-jwt',
      user: { role: 'Admin', companyId: 1 }
    }));

    component.form.setValue({
      email: 'admin@teste.com',
      password: '123456'
    });

    const button = fixture.debugElement.query(By.css('button[type="submit"]'));
    button.nativeElement.click();

    expect(authService.login).toHaveBeenCalledWith('admin@teste.com', '123456');
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });

  it('deve mostrar erro com credenciais inválidas', () => {
    authService.login.mockReturnValue(of(null));

    component.form.setValue({ email: 'errado', password: 'errado' });
    component.onSubmit();

    fixture.detectChanges();

    const error = fixture.debugElement.query(By.css('.alert-danger'));
    expect(error).toBeTruthy();
    expect(error.nativeElement.textContent).toContain('E-mail ou senha incorretos');
  });
});