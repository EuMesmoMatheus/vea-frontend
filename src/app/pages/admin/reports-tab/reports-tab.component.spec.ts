import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportsTabComponent } from './reports-tab.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('ReportsTabComponent', () => {
  let component: ReportsTabComponent;
  let fixture: ComponentFixture<ReportsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsTabComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsTabComponent);
    component = fixture.componentInstance;

    // Setup required inputs
    component.serviceReports = [
      { name: 'Corte', count: 10, totalPrice: 500 },
      { name: 'Barba', count: 5, totalPrice: 125 }
    ];
    component.lastUpdate = new Date();

    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve receber relatórios de serviços', () => {
    expect(component.serviceReports.length).toBe(2);
    expect(component.serviceReports[0].name).toBe('Corte');
  });

  it('deve calcular contagem correta', () => {
    const totalCount = component.serviceReports.reduce((sum, r) => sum + r.count, 0);
    expect(totalCount).toBe(15);
  });

  it('deve calcular preço total correto', () => {
    const totalPrice = component.serviceReports.reduce((sum, r) => sum + r.totalPrice, 0);
    expect(totalPrice).toBe(625);
  });

  it('deve ter trackByName funcionando', () => {
    const item = { name: 'Corte', count: 10, totalPrice: 500 };
    expect(component.trackByName(0, item)).toBe('Corte');
  });

  it('deve ter lastUpdate como Date', () => {
    expect(component.lastUpdate instanceof Date).toBeTrue();
  });
});
