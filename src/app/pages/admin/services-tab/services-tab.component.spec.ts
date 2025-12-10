import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ServicesTabComponent } from './services-tab.component';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('ServicesTabComponent', () => {
  let component: ServicesTabComponent;
  let fixture: ComponentFixture<ServicesTabComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  const mockServices = [
    { id: 1, name: 'Corte', price: 50, duration: 30, active: true },
    { id: 2, name: 'Barba', price: 25, duration: 15, active: true },
    { id: 3, name: 'Inativo', price: 10, duration: 10, active: false }
  ];

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['toggleServiceActive']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    await TestBed.configureTestingModule({
      imports: [ServicesTabComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ServicesTabComponent);
    component = fixture.componentInstance;
    component.services = [...mockServices];
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve abrir modal de novo serviço', () => {
    component.openServiceModal();

    expect(component.showServiceModal).toBeTrue();
    expect(component.editingId).toBeNull();
    expect(component.serviceForm.get('name')?.value).toBe('');
  });

  it('deve abrir modal de edição com dados do serviço', () => {
    component.openServiceModal(1);

    expect(component.showServiceModal).toBeTrue();
    expect(component.editingId).toBe(1);
    expect(component.serviceForm.get('name')?.value).toBe('Corte');
    expect(component.serviceForm.get('hours')?.value).toBe(0);
    expect(component.serviceForm.get('minutes')?.value).toBe(30);
  });

  it('deve validar duração mínima', () => {
    component.openServiceModal();
    component.serviceForm.patchValue({ hours: 0, minutes: 0 });

    expect(component.serviceForm.hasError('durationZero')).toBeTrue();
  });

  it('deve formatar preço corretamente', () => {
    const event = { target: { value: '5000' } };
    component.formatPrice(event);

    expect(event.target.value).toBe('50,00');
  });

  it('deve emitir evento ao salvar serviço', () => {
    const service = { id: 4, name: 'Novo', price: 100, duration: 60, active: true };
    const emitSpy = spyOn(component.serviceSaved, 'emit');

    component.onSaveService(service);

    expect(emitSpy).toHaveBeenCalledWith(service);
    expect(component.showServiceModal).toBeFalse();
  });

  it('deve alternar status do serviço', fakeAsync(() => {
    apiServiceSpy.toggleServiceActive.and.returnValue(of({
      success: true,
      data: { id: 1, name: 'Corte', price: 50, duration: 30, active: false }
    }));

    const emitSpy = spyOn(component.serviceToggled, 'emit');
    component.toggleServiceActive(1, true);
    tick();

    expect(apiServiceSpy.toggleServiceActive).toHaveBeenCalledWith(1, false);
    expect(emitSpy).toHaveBeenCalled();
  }));

  it('deve confirmar antes de deletar', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const emitSpy = spyOn(component.serviceDeleted, 'emit');

    component.deleteService(1);

    expect(window.confirm).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith(1);
  });

  it('não deve deletar se usuário cancelar', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const emitSpy = spyOn(component.serviceDeleted, 'emit');

    component.deleteService(1);

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('deve ter trackById funcionando', () => {
    const item = { id: 5, name: 'Test', duration: 30, price: 50, active: true };
    expect(component.trackById(0, item)).toBe(5);
  });
});
