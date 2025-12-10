import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HubComponent } from './hub.component';
import { ApiService } from '../../services/api.service';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('HubComponent', () => {
  let component: HubComponent;
  let fixture: ComponentFixture<HubComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockUser = { name: 'Usuário Teste', email: 'user@test.com', role: 'Client' };
  const mockCompanies = [
    { id: 1, name: 'Barbearia A', businessType: 'Barbearia', cidade: 'São Paulo', cep: '01001-000', operatingHours: '09:00-18:00' },
    { id: 2, name: 'Salão B', businessType: 'Estética', cidade: 'Rio', cep: '20000-000', operatingHours: '10:00-20:00' }
  ];

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getCompanies']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    apiServiceSpy.getCompanies.and.returnValue(of({ success: true, data: mockCompanies }));

    localStorage.setItem('user', JSON.stringify(mockUser));

    await TestBed.configureTestingModule({
      imports: [HubComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HubComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('deve criar o componente', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('deve carregar empresas com sucesso', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.companies.length).toBe(2);
    expect(component.filteredCompanies.length).toBe(2);
  }));

  it('deve redirecionar para login se usuário não estiver logado', fakeAsync(() => {
    localStorage.removeItem('user');
    fixture.detectChanges();
    tick();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], jasmine.any(Object));
  }));

  it('deve filtrar empresas por nome', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.searchName = 'Barbearia';
    component.applyAllFilters();

    expect(component.filteredCompanies.length).toBe(1);
    expect(component.filteredCompanies[0].name).toBe('Barbearia A');
  }));

  it('deve filtrar empresas por tipo', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.selectedTipo = 'Estética';
    component.applyAllFilters();

    expect(component.filteredCompanies.length).toBe(1);
    expect(component.filteredCompanies[0].businessType).toBe('Estética');
  }));

  it('deve limpar filtros corretamente', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.searchName = 'Teste';
    component.selectedTipo = 'Barbearia';
    component.clearFilters();

    expect(component.searchName).toBe('');
    expect(component.selectedTipo).toBe('');
    expect(component.filteredCompanies.length).toBe(2);
  }));

  it('deve verificar se empresa está aberta', () => {
    const companyOpen = { operatingHours: '00:00-23:59' };
    const companyClosed = { operatingHours: '00:00-00:01' };

    expect(component.isOpenNow(companyOpen)).toBeTrue();
  });

  it('deve retornar false se operatingHours for inválido', () => {
    expect(component.isOpenNow({})).toBeFalse();
    expect(component.isOpenNow({ operatingHours: 'invalid' })).toBeFalse();
  });

  it('deve abrir modal de agendamento', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const company = { id: 1, name: 'Teste' };
    component.schedule(company);

    expect(component.showModal).toBeTrue();
    expect(component.selectedCompanyId).toBe(1);
  }));

  it('deve fechar modal de agendamento', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.showModal = true;
    component.selectedCompanyId = 1;
    component.closeModal({ success: false });

    expect(component.showModal).toBeFalse();
    expect(component.selectedCompanyId).toBeNull();
  }));

  it('deve fazer logout', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.logout();

    expect(localStorage.getItem('user')).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('deve toggle filtros', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.showFilters).toBeFalse();
    
    component.toggleFilters();
    expect(component.showFilters).toBeTrue();
    
    component.toggleFilters();
    expect(component.showFilters).toBeFalse();
  }));

  it('deve retornar lista de tipos únicos', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const tipos = component.tipoOptions;
    expect(tipos).toContain('Barbearia');
    expect(tipos).toContain('Estética');
    expect(tipos.length).toBe(2);
  }));
});
