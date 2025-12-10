import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { ApiService, Service } from '../../../services/api.service';
import { ServiceModalComponent } from '../modals/service-modal/service-modal.component';
import { ToastService } from '../../../services/toast.service';
import { ConfirmService } from '../../../services/confirm.service';

@Component({
  selector: 'app-services-tab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ServiceModalComponent],
  templateUrl: './services-tab.component.html',
  styleUrls: ['./services-tab.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ServicesTabComponent {
  @Input() services: Service[] = [];  // Usa importado (companyId optional, mas parent garante)
  @Output() serviceSaved = new EventEmitter<Service>();
  @Output() serviceDeleted = new EventEmitter<number>();
  @Output() serviceToggled = new EventEmitter<Service>();
  showServiceModal = false;
  editingId: number | null = null;
  serviceForm: FormGroup;
  submittedService = false;
  error = '';
  constructor(
    private fb: FormBuilder, 
    private api: ApiService, 
    private cdr: ChangeDetectorRef, 
    private toastService: ToastService,
    private confirmService: ConfirmService
  ) {
    this.serviceForm = this.fb.group({
      name: ['', Validators.required],
      hours: [0, [Validators.required, Validators.min(0), Validators.max(24)]],
      minutes: [30, [Validators.required, Validators.min(0), Validators.max(59)]],
      price: ['', Validators.required],
      active: [true, Validators.required]
    }, {
      validators: [this.durationValidator, this.priceValidator],
      updateOn: 'blur'
    });
  }

  openServiceModal(id?: number): void {
    this.editingId = id || null;
    this.submittedService = false;
    this.error = '';
    if (id) {
      const srv = this.services.find(s => s.id === id);
      if (srv) {
        const totalMin = srv.duration;
        const hours = Math.floor(totalMin / 60);
        const minutes = totalMin % 60;
        const priceStr = srv.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        this.serviceForm.patchValue({ name: srv.name, hours, minutes, price: priceStr, active: srv.active });
      }
    } else {
      this.serviceForm.reset({ hours: 0, minutes: 30, price: '0,00', active: true });
    }
    this.showServiceModal = true;
    this.cdr.detectChanges();
  }

  private durationValidator(group: AbstractControl): any {
    const hours = group.get('hours')?.value || 0;
    const minutes = group.get('minutes')?.value || 0;
    const totalMin = hours * 60 + minutes;
    return totalMin === 0 ? { durationZero: true } : null;
  }

  private priceValidator(group: AbstractControl): any {
    const priceStr = group.get('price')?.value || '';
    const price = parseFloat(priceStr.replace(/\./g, '').replace(',', '.')) || 0;
    return price < 0 ? { min: true } : null;
  }

  formatPrice(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value) {
      const numValue = parseInt(value, 10) / 100;
      event.target.value = numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    this.serviceForm.get('price')?.setValue(event.target.value, { emitEvent: false });
  }

  parsePrice(): void {
    this.serviceForm.get('price')?.updateValueAndValidity();
  }

  onSaveService(service: Service): void {
    this.serviceSaved.emit(service);
    this.showServiceModal = false;
    this.serviceForm.reset({ hours: 0, minutes: 30, price: '0,00', active: true });
  }

  toggleServiceActive(id: number, currentActive: boolean): void {
    const newActive = !currentActive;
    this.api.toggleServiceActive(id, newActive).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const updatedService = response.data as Service;
          this.services = this.services.map(s => s.id === id ? updatedService : s);
          this.serviceToggled.emit();
        } else {
          this.error = response.message || 'Falha ao atualizar status';
        }
      },
      error: (err) => this.error = 'Erro ao atualizar status: ' + err.message
    });
  }

  async deleteService(id: number): Promise<void> {
    const confirmed = await this.confirmService.danger(
      'Tem certeza que deseja excluir este serviço?',
      'Excluir Serviço'
    );
    if (confirmed) {
      this.serviceDeleted.emit(id);
    }
  }

  trackById(index: number, item: Service): number { return item.id; }
}