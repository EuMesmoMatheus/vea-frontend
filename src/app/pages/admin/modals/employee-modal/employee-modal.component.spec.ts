import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EmployeeModalComponent } from './employee-modal.component';
import { ApiService } from '../../../../services/api.service';
import { ToastService } from '../../../../services/toast.service';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('EmployeeModalComponent', () => {
  let component: EmployeeModalComponent;
  let fixture: ComponentFixture<EmployeeModalComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  const mockRoles = [
    { id: 1, name: 'Cabeleireiro', active: true },
    { id: 2, name: 'Recepcionista', active: true }
  ];

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getEmployee']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    await TestBed.configureTestingModule({
      imports: [EmployeeModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeModalComponent);
    component = fixture.componentInstance;
    component.roles = mockRoles;
  });

  it('deve criar o componente', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('deve ter formulário com campos corretos', () => {
    fixture.detectChanges();
    expect(component.employeeForm.get('name')).toBeTruthy();
    expect(component.employeeForm.get('email')).toBeTruthy();
    expect(component.employeeForm.get('phone')).toBeTruthy();
    expect(component.employeeForm.get('roleId')).toBeTruthy();
  });

  it('deve carregar dados ao editar', fakeAsync(() => {
    component.editingId = 1;
    apiServiceSpy.getEmployee.and.returnValue(of({
      success: true,
      data: { id: 1, name: 'João', email: 'joao@test.com', phone: '11999999999', roleId: 1, emailVerified: true }
    }));

    fixture.detectChanges();
    tick();

    expect(apiServiceSpy.getEmployee).toHaveBeenCalledWith(1);
    expect(component.employeeForm.get('name')?.value).toBe('João');
    expect(component.employeeForm.get('email')?.value).toBe('joao@test.com');
  }));

  it('deve mostrar erro se falhar ao carregar', fakeAsync(() => {
    component.editingId = 1;
    apiServiceSpy.getEmployee.and.returnValue(throwError(() => ({ message: 'Erro' })));

    fixture.detectChanges();
    tick();

    expect(toastServiceSpy.show).toHaveBeenCalledWith(jasmine.stringContaining('Erro'), 'error');
    expect(component.loading).toBeFalse();
  }));

  it('deve emitir save com dados corretos', () => {
    fixture.detectChanges();
    component.employeeForm.patchValue({
      name: 'Maria',
      email: 'maria@test.com',
      phone: '11888888888',
      roleId: 2
    });

    const emitSpy = spyOn(component.save, 'emit');
    component.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      name: 'Maria',
      email: 'maria@test.com',
      phone: '11888888888',
      roleId: 2
    }));
  });

  it('não deve emitir se formulário for inválido', () => {
    fixture.detectChanges();
    component.employeeForm.patchValue({
      name: '',
      email: 'invalid',
      roleId: ''
    });

    const emitSpy = spyOn(component.save, 'emit');
    component.onSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
    expect(component.submittedEmployee).toBeTrue();
  });

  it('deve validar tipo de arquivo de foto', () => {
    fixture.detectChanges();
    const invalidFile = new File([''], 'document.pdf', { type: 'application/pdf' });
    const event = { target: { files: [invalidFile] } };

    component.onEmployeePhotoChange(event);

    expect(component.employeePhotoError).toContain('imagens');
    expect(component.photoFile).toBeNull();
  });

  it('deve validar tamanho do arquivo de foto', () => {
    fixture.detectChanges();
    // Cria um "arquivo" grande (simulado)
    const largeContent = new Array(6 * 1024 * 1024).fill('a').join('');
    const largeFile = new File([largeContent], 'large.png', { type: 'image/png' });
    const event = { target: { files: [largeFile] } };

    component.onEmployeePhotoChange(event);

    expect(component.employeePhotoError).toContain('grande');
  });

  it('deve emitir close ao fechar', () => {
    fixture.detectChanges();
    const emitSpy = spyOn(component.close, 'emit');
    component.close.emit();

    expect(emitSpy).toHaveBeenCalled();
  });
});
