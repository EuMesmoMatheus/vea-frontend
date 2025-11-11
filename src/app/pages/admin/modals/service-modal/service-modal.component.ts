import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-service-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './service-modal.component.html',
  styleUrls: ['./service-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ServiceModalComponent {
  @Input() serviceForm!: FormGroup;
  @Input() editingId: number | null = null;
  @Input() submittedService = false;
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

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

  // <-- Pequena mudança: Adicionei check extra pra duration >0 antes de emit
  onSubmit(): void {
    this.submittedService = true;
    if (this.serviceForm.valid) {
      const formValue = this.serviceForm.value;
      const duration = (formValue.hours * 60) + formValue.minutes;
      if (duration === 0) {  // <-- Novo: Validação extra
        this.serviceForm.setErrors({ durationZero: true });
        return;
      }
      let priceStr = (formValue.price || '').replace(/\./g, '').replace(',', '.');
      const price = parseFloat(priceStr) || 0;
      const service = { ...formValue, duration, price, id: this.editingId || 0 };  // <-- id=0 pra new
      this.save.emit(service);
    }
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
}