import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular.testing';
import { AdminGeneralComponent } from './admin-general.component';
import { ApiService } from '@app/services/api.service';
import { ToastService } from '@app/services/toast.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';
import { ChangeDetectorRef } from '@angular/core';
import jwtDecode from 'jwt-decode';

// Mock do jwt-decode
jest.mock('jwt-decode', () => jest.fn());

describe('AdminGeneralComponent', () => {
  let component: AdminGeneralComponent;
  let fixture: ComponentFixture<AdminGeneralComponent>;
  let apiService: jest.Mocked<ApiService>;
  let toastService: jest.Mocked<ToastService>;
  let router: jest.Mocked<Router>;
  let cdr: ChangeDetectorRef;

  const mockApiService = {
    getCompany: jest.fn(),
    getEmployees: jest.fn(),
    getRoles: jest.fn(),
    getServices: jest.fn(),
    getAppointmentsWeek: jest.fn()
  };

  const mockToastService = {
    show: jest.fn()
  };

  const mockRouter = {
    navigate: jest.fn()
  };

  // Token válido com role Admin e companyId = 5
  const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiQWRtaW4iLCJjb21wYW55SWQiOiI1IiwiaWF0IjoxNTE2MjM5MDIyfQ.Signature';

  beforeEach(async () => {
    // Mock do jwtDecode
    (jwtDecode as jest.Mock).mockReturnValue({
      role: 'Admin',
      companyId: '5'
    });

    // Mock do localStorage
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'token') return validToken;
      if (key === 'companyId') return '5';
      return null;
    });
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
    Storage.prototype.clear = jest.fn();

    await TestBed.configureTestingModule({
      imports: [AdminGeneralComponent],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: ToastService, useValue: mockToastService },
        { provide: Router, useValue: mockRouter },
        ChangeDetectorRef
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminGeneralComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
    toastService = TestBed.inject(ToastService) as jest.Mocked<ToastService>;
    router = TestBed.inject(Router) as jest.Mocked<Router>;
    cdr = TestBed.inject(ChangeDetectorRef);

    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar todos os dados com sucesso e atualizar métricas', fakeAsync(() => {
    // Mock das respostas da API
    mockApiService.getCompany.mockReturnValue(of({
      success: true,
      data: { id: 5, name: 'Barbearia do Zé', operatingHours: '09:00-18:00' }
    }));
    mockApiService.getEmployees.mockReturnValue(of({ success: true, data: [{ id: 1, name: 'João' }] }));
    mockApiService.getRoles.mockReturnValue(of({ success: true, data: [{ id: 1, name: 'Cabeleireiro' }] }));
    mockApiService.getServices.mockReturnValue(of({ success: true, data: [{ id: 1, name: 'Corte', active: true }] }));
    mockApiService.getAppointmentsWeek.mockReturnValue(of({
      success: true,
      data: [
        { id: 1, status: 'Confirmed', service: { name: 'Corte', price: 50 } }
      ]
    }));

    // Dispara ngOnInit
    component.ngOnInit();
    tick(); // espera o forkJoin

    expect(component.loading).toBe(false);
    expect(component.initialLoading).toBe(false);
    expect(component.employees).toHaveLength(1);
    expect(component.services).toHaveLength(1);
    expect(component.appointments).toHaveLength(1);
    expect(component.totalMetrics.appointments).toBe(1);
    expect(component.totalMetrics.services).toBe(1);
    expect(component.totalMetrics.employees).toBe(1);
    expect(component.companyForm.get('name')?.value).toBe('Barbearia do Zé');
    expect(component.companyForm.get('startTime')?.value).toBe('09:00');
    expect(component.companyForm.get('endTime')?.value).toBe('18:00');
  }));

  it('deve redirecionar para login se não tiver token', fakeAsync(() => {
    Storage.prototype.getItem = jest.fn(() => null); // sem token

    component.ngOnInit();
    tick();

    expect(toastService.show).toHaveBeenCalledWith('Sessão inválida. Faça login novamente.', 'error');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('deve redirecionar para login se companyId for inválido', fakeAsync(() => {
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'token') return validToken;
      if (key === 'companyId') return 'abc'; // inválido
      return null;
    });

    component.ngOnInit();
    tick();

    expect(toastService.show).toHaveBeenCalledWith('Sessão inválida. Faça login novamente.', 'error');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('deve mostrar erro se falhar ao carregar dados da empresa', fakeAsync(() => {
    mockApiService.getCompany.mockReturnValue(of({ success: false, message: 'Erro 500' }));

    component.ngOnInit();
    tick();

    expect(component.error).toContain('Falha ao carregar dados da empresa');
    expect(toastService.show).toHaveBeenCalledWith(expect.stringContaining('Falha ao carregar'), 'error');
  }));

  it('deve trocar de aba corretamente', () => {
    component.switchTab('services');
    expect(component.activeTab).toBe('services');

    component.switchTab('reports');
    expect(component.activeTab).toBe('reports');
  });

  it('deve aplicar classe ativa na aba correta', () => {
    component.activeTab = 'agenda';
    expect(component.activeTabClass('agenda')).toContain('bg-pink-50');
    expect(component.activeTabClass('services')).toContain('hover:bg-gray-50');
  });

  it('deve fazer logout e limpar localStorage', () => {
    component.logout();

    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('companyId');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('deve atualizar métricas após salvar serviço', () => {
    component.services = [{ id: 1, active: true }];
    component.employees = [{ id: 1 }];
    component.appointments = [{ status: 'Confirmed' }];

    component.onServiceSaved({ id: 2, name: 'Novo Serviço', active: true } as any);

    expect(component.services).toHaveLength(2);
    expect(component.totalMetrics.services).toBe(2);
  });

  it('deve recarregar dados da empresa após atualização', fakeAsync(() => {
    mockApiService.getCompany.mockReturnValue(of({
      success: true,
      data: { name: 'Nome Atualizado', operatingHours: '10:00-20:00' }
    }));

    component.onCompanyUpdated();
    tick();

    expect(component.companyForm.get('name')?.value).toBe('Nome Atualizado');
    expect(toastService.show).toHaveBeenCalledWith('Empresa atualizada com sucesso!', 'success');
  }));
});