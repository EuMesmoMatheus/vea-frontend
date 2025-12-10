import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ServiceModalComponent } from './service-modal.component';
import { FormBuilder, Validators } from '@angular/forms';

describe('ServiceModalComponent', () => {
  let component: ServiceModalComponent;
  let fixture: ComponentFixture<ServiceModalComponent>;
  let fb: FormBuilder;

  beforeEach(async () => {
    fb = new FormBuilder();

    await TestBed.configureTestingModule({
      imports: [ServiceModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceModalComponent);
    component = fixture.componentInstance;

    // Setup required input - serviceForm
    component.serviceForm = fb.group({
      name: ['', Validators.required],
      hours: [0, [Validators.required, Validators.min(0), Validators.max(24)]],
      minutes: [30, [Validators.required, Validators.min(0), Validators.max(59)]],
      price: ['50,00', Validators.required],
      active: [true, Validators.required]
    });

    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve formatar preço corretamente', () => {
    const event = { target: { value: '10000' } };
    component.formatPrice(event);

    expect(event.target.value).toBe('100,00');
    expect(component.serviceForm.get('price')?.value).toBe('100,00');
  });

  it('deve emitir save com dados corretos', () => {
    component.serviceForm.patchValue({
      name: 'Corte',
      hours: 0,
      minutes: 30,
      price: '50,00',
      active: true
    });
    component.editingId = null;

    const emitSpy = spyOn(component.save, 'emit');
    component.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      name: 'Corte',
      duration: 30,
      price: 50,
      active: true,
      id: 0
    }));
  });

  it('deve emitir save com id correto ao editar', () => {
    component.serviceForm.patchValue({
      name: 'Corte Editado',
      hours: 1,
      minutes: 0,
      price: '80,00',
      active: true
    });
    component.editingId = 5;

    const emitSpy = spyOn(component.save, 'emit');
    component.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 5,
      duration: 60
    }));
  });

  it('não deve emitir se duração for zero', () => {
    component.serviceForm.patchValue({
      name: 'Teste',
      hours: 0,
      minutes: 0,
      price: '10,00',
      active: true
    });

    const emitSpy = spyOn(component.save, 'emit');
    component.onSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
    expect(component.serviceForm.hasError('durationZero')).toBeTrue();
  });

  it('não deve emitir se formulário for inválido', () => {
    component.serviceForm.patchValue({
      name: '',
      hours: 0,
      minutes: 30,
      price: '10,00',
      active: true
    });

    const emitSpy = spyOn(component.save, 'emit');
    component.onSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('deve emitir close ao fechar', () => {
    const emitSpy = spyOn(component.close, 'emit');
    component.close.emit();

    expect(emitSpy).toHaveBeenCalled();
  });
});
