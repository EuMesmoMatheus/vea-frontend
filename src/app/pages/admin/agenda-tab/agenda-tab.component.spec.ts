import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AgendaTabComponent } from './agenda-tab.component';
import { ApiService } from '../../../services/api.service';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('AgendaTabComponent', () => {
  let component: AgendaTabComponent;
  let fixture: ComponentFixture<AgendaTabComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  const mockAppointments: any[] = [
    { 
      id: 1, 
      status: 'Confirmed', 
      startDateTime: '2025-10-31T10:00:00',
      service: { id: 1, name: 'Corte', price: 50, duration: 30 },
      employee: { id: 1, name: 'João', email: 'joao@test.com', roleId: 1, emailVerified: true }
    },
    { 
      id: 2, 
      status: 'Scheduled', 
      startDateTime: '2025-10-31T14:00:00',
      service: { id: 2, name: 'Barba', price: 25, duration: 15 },
      employee: { id: 1, name: 'João', email: 'joao@test.com', roleId: 1, emailVerified: true }
    }
  ];

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getAppointmentsWeek', 'cancelAppointment']);
    
    apiServiceSpy.getAppointmentsWeek.and.returnValue(of({ success: true, data: mockAppointments }));

    await TestBed.configureTestingModule({
      imports: [AgendaTabComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: apiServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AgendaTabComponent);
    component = fixture.componentInstance;
    component.companyId = 5;
  });

  it('deve criar o componente', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('deve carregar agendamentos ao inicializar', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(apiServiceSpy.getAppointmentsWeek).toHaveBeenCalled();
    expect(component.allAppointments.length).toBe(2);
  }));

  it('deve ter visão semanal como padrão', () => {
    fixture.detectChanges();
    expect(component.selectedView).toBe('week');
  });

  it('deve trocar para visão diária', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.selectedView = 'day';
    component.onViewChange();
    tick();

    expect(component.selectedView).toBe('day');
    expect(apiServiceSpy.getAppointmentsWeek).toHaveBeenCalled();
  }));

  it('deve trocar para visão mensal', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.selectedView = 'month';
    component.onViewChange();
    tick();

    expect(component.selectedView).toBe('month');
  }));

  it('deve navegar para semana anterior', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const initialDate = new Date(component.selectedDate);
    component.prevWeek();
    tick();

    expect(component.selectedDate.getTime()).toBeLessThan(initialDate.getTime());
    expect(apiServiceSpy.getAppointmentsWeek).toHaveBeenCalled();
  }));

  it('deve navegar para próxima semana', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const initialDate = new Date(component.selectedDate);
    component.nextWeek();
    tick();

    expect(component.selectedDate.getTime()).toBeGreaterThan(initialDate.getTime());
  }));

  it('deve retornar ícone correto por status', () => {
    expect(component.getStatusIcon('Confirmed')).toBe('✅');
    expect(component.getStatusIcon('Scheduled')).toBe('⏳');
    expect(component.getStatusIcon('Cancelled')).toBe('❌');
    expect(component.getStatusIcon('Unknown')).toBe('⏳');
  });

  it('deve retornar classe correta por status', () => {
    const confirmedClass = component.getStatusClass('Confirmed');
    expect(confirmedClass['bg-green-100 text-green-800']).toBeTrue();

    const cancelledClass = component.getStatusClass('Cancelled');
    expect(cancelledClass['bg-red-100 text-red-800']).toBeTrue();
  });

  it('deve cancelar agendamento', fakeAsync(() => {
    spyOn(window, 'confirm').and.returnValue(true);
    apiServiceSpy.cancelAppointment.and.returnValue(of({ success: true }));
    
    fixture.detectChanges();
    tick();

    const emitSpy = spyOn(component.apptCancelled, 'emit');
    
    component.cancelAppointment(1);
    tick();

    expect(apiServiceSpy.cancelAppointment).toHaveBeenCalledWith(1);
    expect(emitSpy).toHaveBeenCalled();
  }));

  it('não deve cancelar se usuário desistir', fakeAsync(() => {
    spyOn(window, 'confirm').and.returnValue(false);
    
    fixture.detectChanges();
    tick();

    component.cancelAppointment(1);
    tick();

    expect(apiServiceSpy.cancelAppointment).not.toHaveBeenCalled();
  }));

  it('deve filtrar agendamentos por dia e hora', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const dateStr = '2025-10-31';
    const hourStr = '10:00';
    
    const appointments = component.getAppointmentsForDayHour(dateStr, hourStr);
    
    expect(appointments.length).toBe(1);
    expect(appointments[0].id).toBe(1);
  }));

  it('deve construir dias da semana corretamente', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.weekDays.length).toBe(7);
    expect(component.weekTitle).toBeTruthy();
  }));
});
