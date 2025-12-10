import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EmployeesTabComponent } from './employees-tab.component';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('EmployeesTabComponent', () => {
  let component: EmployeesTabComponent;
  let fixture: ComponentFixture<EmployeesTabComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  const mockEmployees = [
    { id: 1, name: 'João', email: 'joao@test.com', roleId: 1, emailVerified: true, roleName: 'Cabeleireiro' },
    { id: 2, name: 'Maria', email: 'maria@test.com', roleId: 2, emailVerified: false, roleName: 'Recepcionista' }
  ];

  const mockRoles = [
    { id: 1, name: 'Cabeleireiro', active: true },
    { id: 2, name: 'Recepcionista', active: true },
    { id: 3, name: 'Inativo', active: false }
  ];

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', [
      'getEmployee', 'createEmployee', 'updateEmployee', 'deleteEmployee',
      'sendVerificationEmail', 'createRole', 'updateRole'
    ]);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    localStorage.setItem('companyId', '5');

    await TestBed.configureTestingModule({
      imports: [EmployeesTabComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeesTabComponent);
    component = fixture.componentInstance;
    component.employees = [...mockEmployees];
    component.roles = [...mockRoles];
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve filtrar apenas cargos ativos', () => {
    expect(component.activeRoles.length).toBe(2);
    expect(component.activeRoles.some(r => r.name === 'Inativo')).toBeFalse();
  });

  it('deve abrir formulário de novo funcionário', () => {
    component.openEmployeeForm();

    expect(component.showEmployeeForm).toBeTrue();
    expect(component.editingId).toBeNull();
    expect(component.employeeForm.get('name')?.value).toBe('');
  });

  it('deve abrir formulário de edição de funcionário', fakeAsync(() => {
    apiServiceSpy.getEmployee.and.returnValue(of({
      success: true,
      data: { id: 1, name: 'João', email: 'joao@test.com', phone: '11999999999', roleId: 1, emailVerified: true }
    }));

    component.openEmployeeForm(1);
    tick();

    expect(component.showEmployeeForm).toBeTrue();
    expect(component.editingId).toBe(1);
    expect(apiServiceSpy.getEmployee).toHaveBeenCalledWith(1);
  }));

  it('deve fechar formulário e limpar estado', () => {
    component.showEmployeeForm = true;
    component.editingId = 1;

    component.closeEmployeeForm();

    expect(component.showEmployeeForm).toBeFalse();
    expect(component.editingId).toBeNull();
  });

  it('deve criar funcionário com sucesso', fakeAsync(() => {
    apiServiceSpy.createEmployee.and.returnValue(of({
      success: true,
      data: { id: 3, name: 'Novo', email: 'novo@test.com', roleId: 1, emailVerified: false }
    }));

    component.openEmployeeForm();
    component.employeeForm.patchValue({
      name: 'Novo',
      email: 'novo@test.com',
      phone: '',
      roleId: 1
    });

    const emitSpy = spyOn(component.employeeSaved, 'emit');
    component.onSaveEmployee();
    tick();

    expect(apiServiceSpy.createEmployee).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalled();
    expect(toastServiceSpy.show).toHaveBeenCalledWith(jasmine.stringContaining('criado'), 'success');
  }));

  it('deve mostrar erro se email já existe', fakeAsync(() => {
    component.openEmployeeForm();
    component.employeeForm.patchValue({
      name: 'Duplicado',
      email: 'joao@test.com', // Email já existe
      roleId: 1
    });

    component.onSaveEmployee();
    tick();

    expect(toastServiceSpy.show).toHaveBeenCalledWith(jasmine.stringContaining('e-mail'), 'error');
    expect(apiServiceSpy.createEmployee).not.toHaveBeenCalled();
  }));

  it('deve abrir modal de cargo', () => {
    component.openRoleModal();

    expect(component.showRoleModal).toBeTrue();
    expect(component.editingRole).toBeNull();
  });

  it('deve criar cargo com sucesso', fakeAsync(() => {
    apiServiceSpy.createRole.and.returnValue(of({
      success: true,
      data: { id: 4, name: 'Novo Cargo', active: true }
    }));

    const emitSpy = spyOn(component.roleSaved, 'emit');
    component.onSaveRole({ name: 'Novo Cargo', active: true });
    tick();

    expect(apiServiceSpy.createRole).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalled();
    expect(toastServiceSpy.show).toHaveBeenCalledWith(jasmine.stringContaining('criado'), 'success');
  }));

  it('deve enviar email de verificação', fakeAsync(() => {
    apiServiceSpy.sendVerificationEmail.and.returnValue(of({ success: true }));

    component.sendVerificationEmail(1);
    tick();

    expect(apiServiceSpy.sendVerificationEmail).toHaveBeenCalledWith(1);
    expect(toastServiceSpy.show).toHaveBeenCalledWith(jasmine.stringContaining('reenviado'), 'success');
  }));

  it('deve deletar funcionário', fakeAsync(() => {
    spyOn(window, 'confirm').and.returnValue(true);
    apiServiceSpy.deleteEmployee.and.returnValue(of({ success: true }));

    const emitSpy = spyOn(component.employeeSaved, 'emit');
    component.deleteEmployee(1);
    tick();

    expect(apiServiceSpy.deleteEmployee).toHaveBeenCalledWith(1);
    expect(emitSpy).toHaveBeenCalled();
  }));

  it('não deve deletar se usuário cancelar', fakeAsync(() => {
    spyOn(window, 'confirm').and.returnValue(false);

    component.deleteEmployee(1);
    tick();

    expect(apiServiceSpy.deleteEmployee).not.toHaveBeenCalled();
  }));
});
