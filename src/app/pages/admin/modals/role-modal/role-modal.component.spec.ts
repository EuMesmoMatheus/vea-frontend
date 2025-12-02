import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoleModalComponent } from './role-modal.component';
import { SimpleChange } from '@angular/core';

describe('RoleModalComponent', () => {
  let component: RoleModalComponent;
  let fixture: ComponentFixture<RoleModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RoleModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve ter formulário com campos corretos', () => {
    expect(component.roleForm.get('name')).toBeTruthy();
    expect(component.roleForm.get('active')).toBeTruthy();
  });

  it('deve carregar dados ao receber editingRole', () => {
    const role = { id: 1, name: 'Cabeleireiro', active: true };
    component.editingRole = role;
    component.ngOnChanges({
      editingRole: new SimpleChange(null, role, true)
    });

    expect(component.roleForm.get('name')?.value).toBe('Cabeleireiro');
    expect(component.roleForm.get('active')?.value).toBeTrue();
  });

  it('deve resetar formulário para novo cargo', () => {
    component.roleForm.patchValue({ name: 'Teste', active: false });
    component.editingRole = null;
    component.ngOnChanges({
      editingRole: new SimpleChange({ id: 1, name: 'Old', active: true }, null, false)
    });

    expect(component.roleForm.get('name')?.value).toBe('');
    expect(component.roleForm.get('active')?.value).toBeTrue();
  });

  it('deve emitir save com dados do formulário', () => {
    component.roleForm.patchValue({ name: 'Novo Cargo', active: true });

    const emitSpy = spyOn(component.save, 'emit');
    component.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({ name: 'Novo Cargo', active: true });
  });

  it('não deve emitir se formulário for inválido', () => {
    component.roleForm.patchValue({ name: '', active: true });

    const emitSpy = spyOn(component.save, 'emit');
    component.onSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
    expect(component.submittedRole).toBeTrue();
  });

  it('deve emitir close ao fechar', () => {
    const emitSpy = spyOn(component.close, 'emit');
    component.close.emit();

    expect(emitSpy).toHaveBeenCalled();
  });
});
