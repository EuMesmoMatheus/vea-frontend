import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';

interface Role {
  id: number;
  name: string;
  active: boolean;
}

@Component({
  selector: 'app-role-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './role-modal.component.html',
  styleUrls: ['./role-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoleModalComponent implements OnChanges {
  @Input() editingId: number | null = null;
  @Input() editingRole: Role | null = null;  // Recebe o role completo pra editar
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();
  roleForm: FormGroup;
  submittedRole = false;

  constructor(private fb: FormBuilder) {
    this.roleForm = this.fb.group({
      name: ['', Validators.required],
      active: [true, Validators.required]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Carrega dados no form se editingRole mudou
    if (changes['editingRole'] && this.editingRole) {
      this.roleForm.patchValue({
        name: this.editingRole.name,
        active: this.editingRole.active
      });
      // Novo: Força validação após patch e reseta estados pra evitar flash de erro
      this.roleForm.get('name')?.updateValueAndValidity();
      this.roleForm.get('name')?.markAsPristine();  // Reset dirty/touched pra edição
      this.roleForm.get('name')?.markAsUntouched();
      this.submittedRole = false;  // Garante que erros não mostrem no open
    } else if (changes['editingRole'] && !this.editingRole) {
      // Novo cargo: reseta form
      this.roleForm.reset({ name: '', active: true });
      this.submittedRole = false;
    }
  }

  onSubmit(): void {
    this.submittedRole = true;
    if (this.roleForm.valid) {
      const payload = { ...this.roleForm.value };
      // Não emite id aqui — o parent usa editingId pra saber se é edit
      this.save.emit(payload);
    }
  }
}