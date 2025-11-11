import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { Role } from '../../../../models/role'; // Ajuste o path se necessário
import { ToastService } from '../../../../services/toast.service';

// Interface Employee definida localmente pra evitar conflitos de import (incluindo phone)
interface Employee {
  id: number;
  name: string;
  email: string;
  phone?: string; // Opcional, pra alinhar com backend
  roleId: number;
  emailVerified: boolean;
  role?: { id: number; name: string; active: boolean };
  photo?: string;
}

@Component({
  selector: 'app-employee-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './employee-modal.component.html',
  styleUrls: ['./employee-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeModalComponent implements OnInit {
  @Input() editingId: number | null = null;
  @Input() roles: Role[] = [];
  @Output() save = new EventEmitter<any>(); // Emite { name, email, phone, roleId, photoFile?: File }
  @Output() close = new EventEmitter<void>();
  employeeForm: FormGroup;
  submittedEmployee = false;
  photoPreview: string | null = null; // Preview local (DataURL)
  photoFile: File | null = null; // Arquivo pra enviar no FormData
  currentPhotoUrl: string | null = null; // URL atual pra edição
  loading = false; // Pro load no edit
  employeePhotoError = '';

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private toastService: ToastService
  ) {
    this.employeeForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      roleId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.editingId) {
      this.loadEmployee(this.editingId);
    }
    this.cdr.detectChanges();
  }

  // Carrega dados pro edit via API
  loadEmployee(id: number): void {
    this.loading = true;
    this.api.getEmployee(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const emp: Employee = response.data;
          this.employeeForm.patchValue({
            name: emp.name,
            email: emp.email,
            phone: emp.phone ?? '', // Usa ?? pra undefined/null virar ''
            roleId: emp.roleId
          });
          this.currentPhotoUrl = emp.photo ?? null;
          this.photoPreview = emp.photo ?? null; // Preview da foto atual
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastService.show('Erro ao carregar funcionário.', 'error');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Preview local da foto (sem upload)
  onEmployeePhotoChange(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // Validações básicas
    if (!file.type.startsWith('image/')) {
      this.employeePhotoError = 'Apenas imagens são permitidas.';
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB
      this.employeePhotoError = 'Arquivo muito grande (máx 5MB).';
      return;
    }

    this.photoFile = file;
    this.employeePhotoError = '';

    // Preview com FileReader
    const reader = new FileReader();
    reader.onload = (e) => {
      this.photoPreview = e.target?.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  onSubmit(): void {
    this.submittedEmployee = true;
    if (this.employeeForm.valid) {
      const formValue = this.employeeForm.value;
      const payload = {
        name: formValue.name,
        email: formValue.email,
        phone: formValue.phone || '',
        roleId: +formValue.roleId, // Garante number
        photoFile: this.photoFile // File ou null
      };
      this.save.emit(payload);
    }
  }
}