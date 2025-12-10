import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AdminGeneralComponent } from './admin-general.component';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('AdminGeneralComponent', () => {
  let component: AdminGeneralComponent;
  let fixture: ComponentFixture<AdminGeneralComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let routerSpy: jasmine.SpyObj<Router>;

  // Token JWT válido com role Admin e companyId = 5
  const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiQWRtaW4iLCJjb21wYW55SWQiOiI1IiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', [
      'getCompany', 'getEmployees', 'getRoles', 'getServices', 'getAppointmentsWeek',
      'createService', 'updateService', 'deleteService'
    ]);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // Mocks default
    apiServiceSpy.getCompany.and.returnValue(of({
      success: true,
      data: { id: 5, name: 'Barbearia do Zé', operatingHours: '09:00-18:00', isActive: true }
    }));
    apiServiceSpy.getEmployees.and.returnValue(of({ success: true, data: [] }));
    apiServiceSpy.getRoles.and.returnValue(of({ success: true, data: [] }));
    apiServiceSpy.getServices.and.returnValue(of({ success: true, data: [] }));
    apiServiceSpy.getAppointmentsWeek.and.returnValue(of({ success: true, data: [] }));

    // Setup localStorage
    localStorage.setItem('token', validToken);
    localStorage.setItem('companyId', '5');

    await TestBed.configureTestingModule({
      imports: [AdminGeneralComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminGeneralComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('deve criar o componente', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('deve carregar todos os dados com sucesso', fakeAsync(() => {
    apiServiceSpy.getCompany.and.returnValue(of({
      success: true,
      data: { id: 5, name: 'Barbearia do Zé', operatingHours: '09:00-18:00', isActive: true }
    }));
    apiServiceSpy.getEmployees.and.returnValue(of({ success: true, data: [{ id: 1, name: 'João', email: 'joao@test.com', roleId: 1, emailVerified: true }] }));
    apiServiceSpy.getRoles.and.returnValue(of({ success: true, data: [{ id: 1, name: 'Cabeleireiro', active: true }] }));
    apiServiceSpy.getServices.and.returnValue(of({ success: true, data: [{ id: 1, name: 'Corte', price: 50, duration: 30, active: true }] }));
    apiServiceSpy.getAppointmentsWeek.and.returnValue(of({
      success: true,
      data: [{ id: 1, status: 'Confirmed', startDateTime: '2025-10-31T10:00:00', service: { id: 1, name: 'Corte', price: 50 } }]
    }));

    fixture.detectChanges();
    tick();

    expect(component.loading).toBe(false);
    expect(component.employees.length).toBe(1);
    expect(component.services.length).toBe(1);
    expect(component.companyForm.get('name')?.value).toBe('Barbearia do Zé');
  }));

  it('deve redirecionar para login se não tiver token', fakeAsync(() => {
    localStorage.clear();
    fixture.detectChanges();
    tick();

    expect(toastServiceSpy.show).toHaveBeenCalledWith('Sessão inválida. Faça login novamente.', 'error');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('deve trocar de aba corretamente', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.switchTab(component.tabs.Services);
    expect(component.activeTab).toBe(component.tabs.Services);

    component.switchTab(component.tabs.Reports);
    expect(component.activeTab).toBe(component.tabs.Reports);
  }));

  it('deve aplicar classe ativa na aba correta', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.activeTab = component.tabs.Agenda;
    expect(component.activeTabClass(component.tabs.Agenda)).toContain('bg-pink-50');
    expect(component.activeTabClass(component.tabs.Services)).toContain('hover:bg-gray-50');
  }));

  it('deve fazer logout e limpar localStorage', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('companyId')).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('deve atualizar métricas após salvar serviço', fakeAsync(() => {
    apiServiceSpy.createService.and.returnValue(of({
      success: true,
      data: { id: 2, name: 'Novo Serviço', price: 100, duration: 60, active: true }
    }));

    fixture.detectChanges();
    tick();

    const newService = { id: 0, name: 'Novo Serviço', price: 100, duration: 60, active: true };
    component.onServiceSaved(newService);
    tick();

    expect(component.services.length).toBeGreaterThanOrEqual(1);
    expect(toastServiceSpy.show).toHaveBeenCalledWith('Serviço criado!', 'success');
  }));

  it('deve mostrar erro se falhar ao carregar dados da empresa', fakeAsync(() => {
    apiServiceSpy.getCompany.and.returnValue(of({ success: false, message: 'Erro ao carregar' }));

    fixture.detectChanges();
    tick();

    expect(component.error).toContain('Falha ao carregar dados da empresa');
    expect(toastServiceSpy.show).toHaveBeenCalled();
  }));
});
