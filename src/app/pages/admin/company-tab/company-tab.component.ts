import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, AbstractControl } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';
// OPCIONAL: Compressão de imagem (instale com: npm i ngx-image-compress e descomente abaixo)
// import { NgxImageCompressService } from 'ngx-image-compress';

@Component({
  selector: 'app-company-tab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './company-tab.component.html',
  styleUrls: ['./company-tab.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompanyTabComponent implements OnChanges {
  @Input() companyForm!: FormGroup;
  @Input() businessTypes: any[] = [];
  @Input() companyId!: number;
  @Output() companyUpdated = new EventEmitter<void>();
  submitted = false;
  buttonLoading = false;
  logoUploading = false;
  coverUploading = false;
  logoError = '';
  coverError = '';
  cepError = '';

  private addressSubscriptions: any[] = [];
  // OPCIONAL: Injete se usar compressão
  // private imgCompress = inject(NgxImageCompressService);

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private toastService: ToastService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['companyForm'] && this.companyForm) {
      this.setupAddressListeners();
      this.updateLocation();
    }
  }

  private setupAddressListeners(): void {
    this.addressSubscriptions.forEach(sub => sub.unsubscribe());
    this.addressSubscriptions = [];
    const fields = ['logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'];
    fields.forEach(field => {
      const sub = this.companyForm.get(field)?.valueChanges.subscribe(() => {
        this.updateLocation();
      });
      if (sub) this.addressSubscriptions.push(sub);
    });
  }

  private updateLocation(): void {
    const logradouro = this.companyForm.get('logradouro')?.value || '';
    const numero = this.companyForm.get('numero')?.value || '';
    const complemento = this.companyForm.get('complemento')?.value || '';
    const bairro = this.companyForm.get('bairro')?.value || '';
    const cidade = this.companyForm.get('cidade')?.value || '';
    const uf = this.companyForm.get('uf')?.value || '';
    const street = [logradouro, numero].filter(Boolean).join(', ');
    const details = [complemento, bairro].filter(Boolean).join(' - ');
    const cityState = [cidade, uf].filter(Boolean).join(' - ');
    const fullLocation = [street, details, cityState]
      .filter(Boolean)
      .join(' - ');
    this.companyForm.patchValue({ location: fullLocation }, { emitEvent: false });
  }

  formatCep(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 5) value = value.replace(/(\d{5})(\d{1,3})/, '$1-$2');
    input.value = value;
    this.companyForm.get('cep')?.setValue(value, { emitEvent: true });
  }

  async buscarCep(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const cep = input.value.replace(/\D/g, '');
    this.cepError = '';
    if (cep.length !== 8) return;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        this.companyForm.patchValue({
          logradouro: data.logradouro || '',
          complemento: data.complemento || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          uf: data.uf || ''
        }, { emitEvent: false });
        this.updateLocation();
      } else {
        this.cepError = 'CEP não encontrado. Preencha manualmente.';
      }
    } catch (error) {
      this.cepError = 'Erro na busca. Tente novamente.';
    }
    this.cdr.detectChanges();
  }

  formatPhone(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    value = value.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
    input.value = value;
    this.companyForm.get('phone')?.setValue(value, { emitEvent: true });
  }

  onLogoUpload(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    this.logoUploading = true;
    this.logoError = '';
    const fileToUpload = file;
    this.api.uploadImage(fileToUpload, 'logo').subscribe({
      next: (response) => {
        console.log('Response do upload logo:', response); // DEBUG: Verifique a URL
        if (response.success === true) {
          this.companyForm.patchValue({ logo: response.data }, { emitEvent: false });
          this.companyForm.updateValueAndValidity();
          (event.target as HTMLInputElement).value = '';
        }
        this.logoUploading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro upload logo:', err);
        this.logoError = 'Erro ao upload: ' + (err.message || 'Tente novamente');
        this.logoUploading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onCoverUpload(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    this.coverUploading = true;
    this.coverError = '';
    const fileToUpload = file;
    this.api.uploadImage(fileToUpload, 'cover').subscribe({
      next: (response) => {
        console.log('Response do upload cover:', response); // DEBUG: Verifique a URL
        if (response.success === true) {
          this.companyForm.patchValue({ coverImage: response.data }, { emitEvent: false });
          this.companyForm.updateValueAndValidity();
          (event.target as HTMLInputElement).value = '';
        }
        this.coverUploading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro upload cover:', err);
        this.coverError = 'Erro ao upload: ' + (err.message || 'Tente novamente');
        this.coverUploading = false;
        this.cdr.markForCheck();
      }
    });
  }

  updateCompany(): void {
    this.submitted = true;
    if (this.companyForm.invalid) return;
    this.buttonLoading = true;

    const formValue = this.companyForm.value;
    const operatingHours = `${formValue.startTime}-${formValue.endTime}` || '';

    const payload = new FormData();
    payload.append('id', this.companyId.toString());
    payload.append('name', formValue.name || '');
    payload.append('email', formValue.email || '');
    payload.append('businessType', formValue.businessType || '');
    payload.append('cep', formValue.cep || '');
    payload.append('logradouro', formValue.logradouro || '');
    payload.append('numero', formValue.numero || '');
    payload.append('complemento', formValue.complemento || '');
    payload.append('bairro', formValue.bairro || '');
    payload.append('cidade', formValue.cidade || '');
    payload.append('uf', formValue.uf || '');
    payload.append('phone', formValue.phone || '');
    payload.append('operatingHours', operatingHours);

    // Anexa URLs como strings (do upload prévio)
    if (formValue.logo) payload.append('Logo', formValue.logo);
    if (formValue.coverImage) payload.append('CoverImage', formValue.coverImage);

    // If guards explícitos pra null/undefined
    const logoFileInput = document.getElementById('logoFile') as HTMLInputElement | null;
    if (logoFileInput && logoFileInput.files && logoFileInput.files.length > 0) {
      payload.append('LogoFile', logoFileInput.files[0]);
    }

    const coverFileInput = document.getElementById('coverFile') as HTMLInputElement | null;
    if (coverFileInput && coverFileInput.files && coverFileInput.files.length > 0) {
      payload.append('CoverImageFile', coverFileInput.files[0]);
    }

    this.api.updateCompany(this.companyId, payload).subscribe({
      next: (response) => {
        this.buttonLoading = false;
        if (response.success === true) {
          setTimeout(() => {
            this.toastService.show('Modificações salvas com sucesso! ✅', 'success', 4000);
            this.companyUpdated.emit();
          }, 500);
        }
      },
      error: (err) => {
        this.buttonLoading = false;
        this.toastService.show('Erro ao salvar as alterações. Tente novamente. ❌', 'error', 4000);
        console.error('Erro full:', err);
      }
    });
  }

  private customValidator(control: AbstractControl): any {
    return null;
  }
}