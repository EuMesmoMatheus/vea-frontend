import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { RoleModalComponent } from '../modals/role-modal/role-modal.component';
import { ToastService } from '../../../services/toast.service';
import { ConfirmService } from '../../../services/confirm.service';
import { jwtDecode } from 'jwt-decode';

interface Employee {
  id: number;
  name: string;
  email: string;
  phone?: string;
  roleId: number;
  emailVerified: boolean;
  roleName?: string;  // Novo: Nome do cargo direto do DTO
  role?: { id: number; name: string; active: boolean };
  fullPhotoUrl?: string;  // Novo: URL completa da foto (do DTO backend)
}

interface Role {
  id: number;
  name: string;
  active: boolean;
}

@Component({
  selector: 'app-employees-tab',
  standalone: true,
  imports: [CommonModule, RoleModalComponent, ReactiveFormsModule],
  templateUrl: './employees-tab.component.html',
  styleUrls: ['./employees-tab.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeesTabComponent {
  @Input() employees: Employee[] = [];
  @Input() roles: Role[] = [];
  @Output() employeeSaved = new EventEmitter<Employee>();
  @Output() roleSaved = new EventEmitter<Role>();
  showRoleModal = false;
  editingId: number | null = null;
  editingRole: Role | null = null;
  error = '';
  showEmployeeForm = false;
  employeeForm!: FormGroup;
  submittedEmployee = false;
  photoUploading = false;
  photoError = '';
  photoFile: File | null = null; // Armazena o File para upload no save
  photoPreview: string | null = null; // Preview local (DataURL) ou full URL

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private toastService: ToastService,
    private confirmService: ConfirmService
  ) {
    this.employeeForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      roleId: ['', Validators.required],
      photo: [''] // Armazena a URL relativa da foto para edição (extraída da full)
    });
  }

  get activeRoles(): Role[] {
    return this.roles.filter(r => r.active);
  }

  openEmployeeForm(id?: number): void {
    this.editingId = id || null;
    this.showEmployeeForm = true;
    this.submittedEmployee = false;
    this.photoError = '';
    this.photoFile = null;
    this.photoPreview = null;
    if (id) {
      // Edição: Carrega dados existentes
      this.loadEmployee(id);
    } else {
      // Novo cadastro: Reset simples, sem photo
      this.employeeForm.reset({
        name: '',
        email: '',
        phone: '',
        roleId: ''
      });
    }
    this.cdr.detectChanges();
  }

  closeEmployeeForm(): void {
    this.showEmployeeForm = false;
    this.editingId = null;
    this.employeeForm.reset();
    this.photoFile = null;
    this.photoPreview = null;
  }

  loadEmployee(id: number): void {
    this.api.getEmployee(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const emp = response.data;
          // Extrai a URL relativa para o form (backend espera relativa em PhotoUrl)
          const relativePhoto = this.getRelativePhotoUrl(emp.fullPhotoUrl);
          this.employeeForm.patchValue({
            name: emp.name,
            email: emp.email,
            phone: emp.phone ?? '',
            roleId: emp.roleId,
            photo: relativePhoto  // Relativa para payload de update
          });
          // Preview: Usa full URL ou fallback
          this.photoPreview = emp.fullPhotoUrl || 'https://via.placeholder.com/150x150/cccccc/666666?text=Sem+Foto';
        }
      },
      error: (err) => {
        this.toastService.show('Erro ao carregar funcionário.', 'error');
      }
    });
  }

  // Helper: Extrai path relativo da full URL (ex: http://localhost:63562/uploads/... -> /uploads/...)
  private getRelativePhotoUrl(fullUrl?: string): string {
    if (!fullUrl) return '/uploads/employees/default-avatar.png';
    try {
      return new URL(fullUrl).pathname;
    } catch {
      return fullUrl.startsWith('/') ? fullUrl : `/uploads/employees/default-avatar.png`;
    }
  }

  onEmployeePhotoUpload(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
   
    // Validações rápidas
    if (!file.type.startsWith('image/')) {
      this.photoError = 'Apenas imagens são permitidas.';
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB
      this.photoError = 'Arquivo muito grande (máx 5MB).';
      return;
    }
    this.photoFile = file;
    this.photoError = '';
   
    // Preview local imediato com FileReader (sem upload ainda)
    const reader = new FileReader();
    reader.onload = (e) => {
      this.photoPreview = e.target?.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
   
    (event.target as HTMLInputElement).value = ''; // Limpa o input
  }

  onSaveEmployee(): void {
    this.submittedEmployee = true;
    if (this.employeeForm.invalid) return;
    const formValue = this.employeeForm.value;
    const existing = this.employees.find(e =>
      e.email.toLowerCase() === formValue.email.toLowerCase() &&
      e.id !== this.editingId
    );
    if (existing) {
      this.toastService.show('Já existe um funcionário com esse e-mail!', 'error');
      return;
    }
    const payload = new FormData();
    payload.append('Name', formValue.name);
    payload.append('Email', formValue.email);
    payload.append('Phone', formValue.phone || '');
    payload.append('RoleId', formValue.roleId.toString());
   
    // Adiciona foto: File novo ou URL relativa existente (para edição sem mudança)
    if (this.photoFile) {
      payload.append('photo', this.photoFile); // Backend espera 'photo' como IFormFile
    } else if (formValue.photo && this.editingId) {
      payload.append('PhotoUrl', formValue.photo); // Relativa, extraída na load
    }
   
    if (this.editingId) {
      // Id vem na rota, não no FormData
      this.api.updateEmployee(this.editingId, payload).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.employeeSaved.emit(response.data);
            this.closeEmployeeForm();
            this.toastService.show('Funcionário atualizado!', 'success');
          }
        },
        error: (err) => this.handleEmployeeError(err, 'atualizar')
      });
    } else {
      this.api.createEmployee(payload).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.employeeSaved.emit(response.data);
            this.closeEmployeeForm();
            this.toastService.show('Funcionário criado! Email enviado.', 'success');
          }
        },
        error: (err) => this.handleEmployeeError(err, 'criar')
      });
    }
  }

  private handleEmployeeError(err: any, action: string): void {
    const msg = err?.error?.message?.toLowerCase().includes('duplicate') ? 'E-mail já existe!' : `Erro ao ${action} funcionário.`;
    this.toastService.show(msg, 'error');
    console.error(err);
  }

  openRoleModal(id?: number): void {
    this.editingId = id || null;
    if (id) {
      this.editingRole = this.roles.find(r => r.id === id) || null;
    } else {
      this.editingRole = null;
    }
    this.showRoleModal = true;
    this.cdr.detectChanges();
  }

  onSaveRole(role: any): void {  // Payload do form: {name, active}
    const companyId = this.getCompanyId();
    if (!companyId) {
      this.error = 'ID da empresa não encontrado.';
      this.toastService.show('ID da empresa não encontrado.', 'error');
      return;
    }
    if (this.editingId) {
      // Edição: valida duplicata (excluindo si mesmo)
      const existingRole = this.roles.find(r =>
        r.id !== this.editingId && r.name.toLowerCase() === role.name.toLowerCase()
      );
      if (existingRole) {
        this.toastService.show('Já existe um cargo com esse nome!', 'error');
        return;
      }
      // Chama update com companyId no payload
      this.api.updateRole(this.editingId, { id: this.editingId, ...role, companyId }).subscribe({
        next: (response) => {
          if (response.success === true) {
            this.roleSaved.emit({ ...role, id: this.editingId! });
            this.showRoleModal = false;
            this.error = '';
            this.toastService.show('Cargo atualizado com sucesso!', 'success');
          } else {
            const isDuplicateError = response.message?.toLowerCase().includes('duplicate') ||
                                      response.message?.toLowerCase().includes('já existe') ||
                                      response.message?.toLowerCase().includes('unique');
            const isInactivationError = response.message?.toLowerCase().includes('não é possível inativar') ||
                                         response.message?.toLowerCase().includes('funcionários associados');
            const errorMsg = isInactivationError ? response.message! :
                             (isDuplicateError ? 'Já existe um cargo com esse nome!' : 'Erro ao atualizar cargo. Tente novamente.');
            this.error = response.message || errorMsg;
            this.toastService.show(errorMsg, 'error');
          }
        },
        error: (err) => {
          const isDuplicateError = err?.error?.message?.toLowerCase().includes('duplicate') ||
                                   err?.error?.message?.toLowerCase().includes('já existe') ||
                                   err?.error?.message?.toLowerCase().includes('unique') ||
                                   err.status === 409;
          const isInactivationError = err?.error?.message?.toLowerCase().includes('não é possível inativar') ||
                                       err?.error?.message?.toLowerCase().includes('funcionários associados');
          const errorMsg = isInactivationError ? err.error.message :
                           (isDuplicateError ? 'Já existe um cargo com esse nome!' : 'Falha na conexão ao atualizar cargo.');
          this.error = errorMsg;
          this.toastService.show(errorMsg, 'error');
        }
      });
    } else {
      // Criação: valida duplicata
      const existingRole = this.roles.find(r => r.name.toLowerCase() === role.name.toLowerCase());
      if (existingRole) {
        this.toastService.show('Já existe um cargo com esse nome!', 'error');
        return;
      }
      // Chama create com companyId
      this.api.createRole({ ...role, companyId }).subscribe({
        next: (response) => {
          if (response.success === true && response.data) {
            const savedRole = response.data as Role;
            this.roleSaved.emit(savedRole);
            this.showRoleModal = false;
            this.error = '';
            this.toastService.show('Cargo criado com sucesso!', 'success');
          } else {
            const isDuplicateError = response.message?.toLowerCase().includes('duplicate') ||
                                     response.message?.toLowerCase().includes('já existe') ||
                                     response.message?.toLowerCase().includes('unique');
            const errorMsg = isDuplicateError ? 'Já existe um cargo com esse nome!' : 'Erro ao criar cargo. Tente novamente.';
            this.error = response.message || errorMsg;
            this.toastService.show(errorMsg, 'error');
          }
        },
        error: (err) => {
          const isDuplicateError = err?.error?.message?.toLowerCase().includes('duplicate') ||
                                   err?.error?.message?.toLowerCase().includes('já existe') ||
                                   err?.error?.message?.toLowerCase().includes('unique') ||
                                   err.status === 409;
          const errorMsg = isDuplicateError ? 'Já existe um cargo com esse nome!' : 'Falha na conexão ao criar cargo.';
          this.error = errorMsg;
          this.toastService.show(errorMsg, 'error');
        }
      });
    }
    this.editingRole = null;
  }

  sendVerificationEmail(empId: number): void {
    this.api.sendVerificationEmail(empId).subscribe({
      next: () => {
        this.toastService.show('Email de verificação reenviado!', 'success');
      },
      error: (err) => {
        this.error = 'Erro ao enviar: ' + err.message;
        this.toastService.show('Erro ao reenviar email.', 'error');
      }
    });
  }

  async deleteEmployee(id: number): Promise<void> {
    const confirmed = await this.confirmService.danger(
      'Tem certeza que deseja excluir este funcionário?',
      'Excluir Funcionário'
    );
    
    if (confirmed) {
      this.api.deleteEmployee(id).subscribe({
        next: (response) => {
          if (response.success === true) {
            this.employeeSaved.emit({ id } as Employee);
            this.toastService.show('Funcionário deletado com sucesso!', 'success');
          } else {
            // Backend retornou success: false
            const msg = response.message || 'Não foi possível excluir o funcionário.';
            this.toastService.show(msg, 'error');
          }
        },
        error: (err) => {
          // Tenta extrair mensagem do backend
          const backendMsg = err.error?.message || err.error?.Message || err.error?.title;
          const errorMsg = backendMsg || 'Não foi possível excluir. O funcionário pode ter agendamentos vinculados.';
          this.error = errorMsg;
          this.toastService.show(errorMsg, 'error');
        }
      });
    }
  }

  trackById(index: number, item: any): number { return item.id; }

  private getCompanyId(): number {
    const idStr = localStorage.getItem('companyId');
    if (!idStr) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          return decoded.companyId ? parseInt(decoded.companyId, 10) : 0;
        } catch (e) {
          return 0;
        }
      }
      return 0;
    }
    return parseInt(idStr, 10);
  }
}