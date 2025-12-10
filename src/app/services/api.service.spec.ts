import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl.endsWith('/')
    ? environment.apiUrl + 'api'
    : environment.apiUrl + '/api';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiService
      ]
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('deve fazer login com sucesso', () => {
      const mockResponse = {
        success: true,
        token: 'fake-token',
        user: { id: 1, name: 'Test', email: 'test@test.com' },
        message: 'Login realizado'
      };

      service.login('test@test.com', 'password123').subscribe(response => {
        expect(response.success).toBeTrue();
        expect(response.token).toBe('fake-token');
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'test@test.com', password: 'password123' });
      req.flush(mockResponse);
    });

    it('deve lidar com erro de login', () => {
      service.login('test@test.com', 'wrong').subscribe({
        error: (error) => {
          expect(error.message).toBeTruthy();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/login`);
      req.flush({ message: 'Credenciais inválidas' }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('register', () => {
    it('deve registrar cliente com sucesso', () => {
      const mockResponse = {
        success: true,
        user: { id: 1, name: 'Novo User' },
        message: 'Cadastro realizado!'
      };

      const userData = { name: 'Novo User', email: 'novo@test.com', password: '123456' };

      service.register('auth/register/client', userData).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/register/client`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('getCompanies', () => {
    it('deve buscar empresas', () => {
      const mockResponse = {
        success: true,
        data: [
          { id: 1, name: 'Empresa 1' },
          { id: 2, name: 'Empresa 2' }
        ]
      };

      service.getCompanies().subscribe(response => {
        expect(response.success).toBeTrue();
        expect(response.data?.length).toBe(2);
      });

      const req = httpMock.expectOne(`${apiUrl}/companies`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('deve filtrar por localização', () => {
      service.getCompanies('SP').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/companies?location=SP`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [] });
    });
  });

  describe('getCompany', () => {
    it('deve buscar empresa por ID', () => {
      const mockResponse = {
        success: true,
        data: { id: 5, name: 'Empresa Teste', isActive: true }
      };

      service.getCompany(5).subscribe(response => {
        expect(response.data?.name).toBe('Empresa Teste');
      });

      const req = httpMock.expectOne(`${apiUrl}/companies/5`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getServices', () => {
    it('deve buscar serviços de uma empresa', () => {
      const mockResponse = {
        success: true,
        data: [
          { id: 1, name: 'Corte', price: 50, duration: 30, active: true },
          { id: 2, name: 'Barba', price: 25, duration: 15, active: true }
        ]
      };

      service.getServices(5).subscribe(response => {
        expect(response.data?.length).toBe(2);
      });

      const req = httpMock.expectOne(`${apiUrl}/services/company/5`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('deve lançar erro se companyId não for fornecido', () => {
      service.getServices(undefined).subscribe({
        error: (error) => {
          expect(error.message).toContain('CompanyId obrigatório');
        }
      });
    });
  });

  describe('getEmployees', () => {
    it('deve buscar funcionários', () => {
      const mockResponse = {
        success: true,
        data: [
          { id: 1, name: 'João', email: 'joao@test.com', roleId: 1, emailVerified: true }
        ]
      };

      service.getEmployees(5).subscribe(response => {
        expect(response.data?.length).toBe(1);
      });

      const req = httpMock.expectOne(`${apiUrl}/employees?companyId=5`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('createService', () => {
    it('deve criar serviço', () => {
      const newService = { id: 0, name: 'Novo Serviço', price: 100, duration: 60, active: true };
      const mockResponse = { success: true, data: { ...newService, id: 3 } };

      service.createService(newService).subscribe(response => {
        expect(response.data?.id).toBe(3);
      });

      const req = httpMock.expectOne(`${apiUrl}/services`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('cancelAppointment', () => {
    it('deve cancelar agendamento', () => {
      const mockResponse = { success: true, message: 'Cancelado' };

      service.cancelAppointment(10).subscribe(response => {
        expect(response.success).toBeTrue();
      });

      const req = httpMock.expectOne(`${apiUrl}/appointments/10/cancel`);
      expect(req.request.method).toBe('PATCH');
      req.flush(mockResponse);
    });
  });
});
