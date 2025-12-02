import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CompanyTabComponent } from './company-tab.component';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CompanyTabComponent', () => {
  let component: CompanyTabComponent;
  let fixture: ComponentFixture<CompanyTabComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let fb: FormBuilder;

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['updateCompany', 'uploadImage']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);
    fb = new FormBuilder();

    await TestBed.configureTestingModule({
      imports: [CompanyTabComponent, ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CompanyTabComponent);
    component = fixture.componentInstance;

    // Setup required inputs
    component.companyId = 5;
    component.businessTypes = [
      { value: 'Barbearia', label: 'Barbearia' },
      { value: 'Estética', label: 'Estética' }
    ];
    component.companyForm = fb.group({
      name: ['Empresa Teste', Validators.required],
      businessType: ['Barbearia'],
      cep: ['01001-000'],
      logradouro: ['Rua Teste'],
      numero: ['100'],
      complemento: [''],
      bairro: ['Centro'],
      cidade: ['São Paulo'],
      uf: ['SP'],
      location: [''],
      phone: ['(11) 99999-9999'],
      startTime: ['09:00'],
      endTime: ['18:00'],
      operatingHours: [''],
      logo: [''],
      coverImage: ['']
    });

    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve formatar CEP corretamente', () => {
    const event = { target: { value: '01001000' } } as unknown as Event;
    component.formatCep(event);

    expect(component.companyForm.get('cep')?.value).toBe('01001-000');
  });

  it('deve formatar telefone corretamente', () => {
    const event = { target: { value: '11999999999' } } as unknown as Event;
    component.formatPhone(event);

    expect(component.companyForm.get('phone')?.value).toBe('(11) 99999-9999');
  });

  it('deve atualizar location quando campos de endereço mudam', () => {
    component.companyForm.patchValue({
      logradouro: 'Av. Paulista',
      numero: '1000',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      uf: 'SP'
    });

    fixture.detectChanges();

    const location = component.companyForm.get('location')?.value;
    expect(location).toContain('Av. Paulista');
    expect(location).toContain('1000');
  });

  it('deve fazer upload de logo com sucesso', fakeAsync(() => {
    apiServiceSpy.uploadImage.and.returnValue(of({
      success: true,
      data: '/uploads/logos/teste.png'
    }));

    const file = new File([''], 'logo.png', { type: 'image/png' });
    const event = { target: { files: [file], value: '' } };

    component.onLogoUpload(event);
    tick();

    expect(apiServiceSpy.uploadImage).toHaveBeenCalledWith(file, 'logo');
    expect(component.companyForm.get('logo')?.value).toBe('/uploads/logos/teste.png');
    expect(component.logoUploading).toBeFalse();
  }));

  it('deve mostrar erro se upload de logo falhar', fakeAsync(() => {
    apiServiceSpy.uploadImage.and.returnValue(throwError(() => ({
      message: 'Erro de upload'
    })));

    const file = new File([''], 'logo.png', { type: 'image/png' });
    const event = { target: { files: [file], value: '' } };

    component.onLogoUpload(event);
    tick();

    expect(component.logoError).toContain('Erro');
    expect(component.logoUploading).toBeFalse();
  }));

  it('deve atualizar empresa com sucesso', fakeAsync(() => {
    apiServiceSpy.updateCompany.and.returnValue(of({ success: true }));

    component.updateCompany();
    tick();

    expect(apiServiceSpy.updateCompany).toHaveBeenCalledWith(5, jasmine.any(FormData));
    expect(toastServiceSpy.show).toHaveBeenCalledWith(jasmine.stringContaining('sucesso'), 'success', jasmine.any(Number));
  }));

  it('não deve atualizar se formulário for inválido', () => {
    component.companyForm.get('name')?.setValue('');
    component.companyForm.get('name')?.markAsTouched();

    component.updateCompany();

    expect(apiServiceSpy.updateCompany).not.toHaveBeenCalled();
  });

  it('deve mostrar erro se atualização falhar', fakeAsync(() => {
    apiServiceSpy.updateCompany.and.returnValue(throwError(() => ({
      message: 'Erro no servidor'
    })));

    component.updateCompany();
    tick();

    expect(toastServiceSpy.show).toHaveBeenCalledWith(jasmine.stringContaining('Erro'), 'error', jasmine.any(Number));
  }));
});
