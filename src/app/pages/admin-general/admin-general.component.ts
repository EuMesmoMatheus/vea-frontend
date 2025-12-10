import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, Service, Appointment as ApiAppointment } from '../../services/api.service';  // Import ApiAppointment daqui
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { ToastService } from '../../services/toast.service';
import { ConfirmService } from '../../services/confirm.service';

interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
}

interface CompanyDto {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  operatingHours?: string;
  businessType?: string;
  isActive: boolean;
  logo?: string;
  coverImage?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

interface Employee {
  id: number;
  name: string;
  email: string;
  roleId: number;
  emailVerified: boolean;
  role?: { id: number; name: string; active: boolean };
  photo?: string;
}

interface Role {
  id: number;
  name: string;
  active: boolean;
}

// <<< FIX: Estende ApiAppointment com dateTime local
interface LocalAppointment extends ApiAppointment {
  dateTime: Date;
}

interface ServiceReport {
  name: string;
  count: number;
  totalPrice: number;
}

enum AdminTab {
  Agenda = 'agenda',
  Services = 'services',
  Employees = 'employees',
  Company = 'company',
  Reports = 'reports'
}

interface TabConfig {
  key: AdminTab;
  label: string;
  iconPath: string;
}

import { AgendaTabComponent } from '../admin/agenda-tab/agenda-tab.component';
import { ServicesTabComponent } from '../admin/services-tab/services-tab.component';
import { EmployeesTabComponent } from '../admin/employees-tab/employees-tab.component';
import { CompanyTabComponent } from '../admin/company-tab/company-tab.component';
import { ReportsTabComponent } from '../admin/reports-tab/reports-tab.component';

@Component({
  selector: 'app-admin-general',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    AgendaTabComponent, ServicesTabComponent, EmployeesTabComponent, CompanyTabComponent, ReportsTabComponent
  ],
  templateUrl: './admin-general.component.html',
  styleUrls: ['./admin-general.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminGeneralComponent implements OnInit {
  activeTab: AdminTab = AdminTab.Agenda;
  tabs = AdminTab;
  tabsArray: TabConfig[] = [
    { key: AdminTab.Agenda, label: 'Agenda', iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { key: AdminTab.Services, label: 'Serviços', iconPath: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { key: AdminTab.Employees, label: 'Funcionários', iconPath: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-7.793a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z' },
    { key: AdminTab.Company, label: 'Empresa', iconPath: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { key: AdminTab.Reports, label: 'Relatórios', iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
  ];
  error = '';
  loading = false;
  initialLoading = true;
  employees: Employee[] = [];
  roles: Role[] = [];
  services: Service[] = [];
  appointments: LocalAppointment[] = [];  // <<< FIX: Agora usa LocalAppointment
  serviceReports: ServiceReport[] = [];
  companyForm!: FormGroup;
  totalMetrics = { appointments: 0, services: 0, employees: 0 };
  companyId: number = 0;  // <<< FIX: Propriedade para binding no HTML
  businessTypes = [
    { value: 'Barbearia', label: 'Barbearia' },
    { value: 'Estética', label: 'Estética' },
    { value: 'Manicure', label: 'Manicure' },
    { value: 'Centro de Psicologia', label: 'Centro de Psicologia' },
    { value: 'Clínica Médica', label: 'Clínica Médica' },
    { value: 'Salão de Beleza', label: 'Salão de Beleza' },
    { value: 'Auto Escola', label: 'Auto Escola' }
  ];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private toastService: ToastService,
    private confirmService: ConfirmService
  ) {
    this.initializeCompanyForm();
  }

  ngOnInit(): void {
    this.companyId = this.getCompanyId();  // <<< FIX: Inicializa como number
    if (!this.companyId || this.companyId === 0) {
      console.error('Invalid companyId:', this.companyId);
      this.toastService.show('Sessão inválida. Faça login novamente.', 'error');
      localStorage.clear();
      this.router.navigate(['/login']);
      return;
    }
    this.initialLoading = true;
    this.loading = true;
    // Datas baseadas na data atual
    const today = new Date();
    const start = today.toISOString().split('T')[0];
    const end = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Usar forkJoin com catchError em cada observable para não quebrar tudo se um falhar
    forkJoin({
      company: this.api.getCompany(this.companyId).pipe(
        catchError(err => {
          console.error('❌ Erro ao carregar empresa:', err);
          return of({ success: false, data: null, message: 'Erro ao carregar empresa' });
        })
      ),
      employees: this.api.getEmployees(this.companyId).pipe(
        catchError(err => {
          console.error('❌ Erro ao carregar funcionários:', err);
          return of({ success: false, data: [], message: 'Erro ao carregar funcionários' });
        })
      ),
      roles: this.api.getRoles(this.companyId).pipe(
        catchError(err => {
          console.error('❌ Erro ao carregar cargos:', err);
          return of({ success: false, data: [], message: 'Erro ao carregar cargos' });
        })
      ),
      services: this.api.getServices(this.companyId, true).pipe(
        catchError(err => {
          console.error('❌ Erro ao carregar serviços:', err);
          return of({ success: false, data: [], message: 'Erro ao carregar serviços' });
        })
      ),
      appointments: this.api.getAppointmentsWeek({
        start,
        end,
        companyId: this.companyId
      }).pipe(
        catchError(err => {
          console.error('❌ Erro ao carregar agendamentos:', err);
          console.error('❌ Detalhes:', { status: err.status, message: err.message, error: err.error });
          // Retorna resposta vazia para não quebrar o forkJoin
          return of({ success: false, data: [], message: 'Erro ao carregar agendamentos' });
        })
      )
    }).subscribe({
      next: (responses) => {
        if (responses.company?.success !== true || !responses.company.data) {
          console.warn('Company data missing or failed:', responses.company);
          this.handleLoadError('Falha ao carregar dados da empresa.');
          return;
        }
        const data = responses.company.data as CompanyDto;
        console.log('📦 Dados da empresa recebidos:', data);
        console.log('⏰ operatingHours:', data.operatingHours);
        this.companyForm.patchValue(data);
        if (data.operatingHours) {
          const [startTime, endTime] = data.operatingHours.split('-');
          console.log('⏰ Parsed times:', { startTime, endTime });
          this.companyForm.patchValue({ startTime: startTime?.trim() || '10:00', endTime: endTime?.trim() || '18:00' });
        } else {
          console.warn('⚠️ operatingHours está vazio ou undefined!');
        }
        this.employees = (responses.employees?.success === true ? (responses.employees.data || []) : []).map((emp: Employee) => ({
          ...emp,
          photo: emp.photo ?? '/uploads/employees/default-avatar.png'
        }));
        this.roles = responses.roles?.success === true ? responses.roles.data || [] : [];
        
        // FIX DEFINITIVO: Map garante companyId como number (resolve assignable no binding)
        this.loadServices(this.companyId, responses.services);
        
        // <<< FIX: Mapeamento corrigido para LocalAppointment (usa startDateTime do ApiAppointment)
        // Se appointments falhou, usar array vazio
        this.appointments = (responses.appointments?.success === true ? (responses.appointments.data || []) : []).map((a: ApiAppointment) => ({
          ...a,
          dateTime: new Date(a.startDateTime)  // <<< Adiciona dateTime local
        })) as LocalAppointment[];

        // Safe report generation (price agora é number garantido)
        const reportsMap = new Map<string, ServiceReport>();
        this.appointments.forEach(a => {
          if (a.status === 'Confirmed') {
            const serviceName = this.getServiceName(a);
            if (serviceName && serviceName !== 'Serviço') {
              if (!reportsMap.has(serviceName)) {
                reportsMap.set(serviceName, { name: serviceName, count: 0, totalPrice: 0 });
              }
              const report = reportsMap.get(serviceName)!;
              report.count++;
              report.totalPrice += this.getAppointmentPrice(a);
            }
          }
        });
        this.serviceReports = Array.from(reportsMap.values());
        this.updateMetrics();
        this.loading = false;
        this.initialLoading = false;
        console.log('Data loaded successfully');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('ForkJoin error:', err);
        this.handleLoadError('Erro ao carregar dados: ' + (err?.message || 'Desconhecido'));
      }
    });
  }

  // HELPER: Garante companyId como number em todos services (resolve TS2322 no template/child)
  private loadServices(companyId: number, response: ApiResponse<Service[]>): void {
    if (response?.success === true && response.data) {
      this.services = response.data.map(s => ({
        ...s,
        companyId: s.companyId ?? companyId  // ?? garante number, nunca undefined
      } as Service));  // Cast final pra TS feliz
    } else {
      this.services = [];
    }
  }

  private handleLoadError(message: string): void {
    this.error = message;
    this.loading = false;
    this.initialLoading = false;
    this.toastService.show(message, 'error');
    this.cdr.detectChanges();
    if (message.includes('empresa') || message.includes('Sessão')) {
      setTimeout(() => this.router.navigate(['/login']), 2000);
    }
  }

  switchTab(tab: AdminTab): void {
    this.activeTab = tab;
    this.error = '';
    this.cdr.detectChanges();
  }

  activeTabClass(tab: AdminTab): string {
    if (this.activeTab === tab) return 'bg-pink-50 text-pink-600 rounded-lg shadow-sm scale-105';
    return 'text-gray-600 hover:bg-gray-50 hover:text-pink-500 rounded-lg shadow-sm';
  }

  private initializeCompanyForm(): void {
    this.companyForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      businessType: ['', Validators.required],
      cep: ['', [Validators.required, Validators.pattern(/^\d{5}-\d{3}$/)]],
      logradouro: ['', Validators.required],
      numero: ['', Validators.required],
      complemento: [''],
      bairro: ['', Validators.required],
      cidade: ['', Validators.required],
      uf: ['', [Validators.required, Validators.pattern(/^[A-Z]{2}$/)]],
      location: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/)]],
      startTime: ['10:00', Validators.required],
      endTime: ['18:00', Validators.required],
      operatingHours: [''],
      logo: [''],
      coverImage: ['']
    });
  }

  private updateMetrics(): void {
    this.totalMetrics = {
      appointments: this.appointments.filter(a => a.status === 'Confirmed').length,
      services: this.services.filter(s => s.active).length,
      employees: this.employees.length
    };
  }

  // Helper para obter o nome do serviço
  private getServiceName(appt: ApiAppointment): string {
    if (appt.services && Array.isArray(appt.services) && appt.services.length > 0) {
      const serviceNames = appt.services
        .filter((s: any) => s && s.name)
        .map((s: any) => s.name);
      if (serviceNames.length > 0) {
        return serviceNames.join(', ');
      }
    }
    if (appt.service?.name) {
      return appt.service.name;
    }
    if (appt.servicesJson) {
      try {
        const parsed = JSON.parse(appt.servicesJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const serviceNames = parsed
            .filter((s: any) => s && s.name)
            .map((s: any) => s.name);
          if (serviceNames.length > 0) {
            return serviceNames.join(', ');
          }
        }
      } catch (e) {
        // Ignora erro de parsing
      }
    }
    return 'Serviço';
  }

  // Helper para converter valor para número (price já vem como número da API)
  private toNumber(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : value;
    }
    if (typeof value === 'string') {
      const cleaned = value.replace(/[R$\s]/g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  // Helper para calcular o preço do agendamento
  private getAppointmentPrice(appt: ApiAppointment): number {
    const apptAny = appt as any;
    
    // Prioridade 1: Verificar campos diretos do agendamento
    if (apptAny.totalPrice !== undefined && apptAny.totalPrice !== null) {
      const price = this.toNumber(apptAny.totalPrice);
      if (price > 0) return price;
    }
    if (apptAny.totalAmount !== undefined && apptAny.totalAmount !== null) {
      const price = this.toNumber(apptAny.totalAmount);
      if (price > 0) return price;
    }
    if (apptAny.price !== undefined && apptAny.price !== null) {
      const price = this.toNumber(apptAny.price);
      if (price > 0) return price;
    }
    
    // Prioridade 2: Array de serviços (price já vem como número)
    if (appt.services && Array.isArray(appt.services) && appt.services.length > 0) {
      const total = appt.services.reduce((sum: number, s: any) => {
        if (!s) return sum;
        const price = this.toNumber(s.price);
        return sum + price;
      }, 0);
      if (total > 0) return total;
    }
    
    // Prioridade 3: Serviço único (price já vem como número)
    if (appt.service?.price !== undefined && appt.service?.price !== null) {
      const price = this.toNumber(appt.service.price);
      if (price > 0) return price;
    }
    
    // Prioridade 4: servicesJson
    if (appt.servicesJson) {
      try {
        const parsed = JSON.parse(appt.servicesJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const total = parsed.reduce((sum: number, s: any) => {
            if (!s) return sum;
            const price = this.toNumber(s.price);
            return sum + price;
          }, 0);
          if (total > 0) return total;
        }
      } catch (e) {
        // Ignora erro de parsing
      }
    }
    
    return 0;
  }

  onServiceSaved(service: Service): void {
    service.companyId = this.companyId;  // Seta como number
    if (!service.companyId) {
      this.toastService.show('Erro: ID da empresa não encontrado. Faça login novamente.', 'error');
      return;
    }
    const isEdit = service.id > 0;
    const apiCall = isEdit
      ? this.api.updateService(service.id, service)
      : this.api.createService(service);
    apiCall.subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const savedService = response.data as Service;
          if (isEdit) {
            this.services = this.services.map(s => s.id === savedService.id ? savedService : s);
          } else {
            this.services = [...this.services, savedService];
          }
          this.updateMetrics();
          this.toastService.show(isEdit ? 'Serviço atualizado!' : 'Serviço criado!', 'success');
         
          // Opcional: Reload full pra sync (descomente se backend mudar employees etc.)
          // this.api.getServices(this.companyId, true).subscribe(res => this.loadServices(this.companyId, res));
        } else {
          this.handleSaveError(service, isEdit, response.message || 'Falha desconhecida');
        }
      },
      error: (err) => {
        console.error('API Error:', err);
        this.handleSaveError(service, isEdit, 'Erro de conexão. Tente novamente.');
      }
    });
  }

  private handleSaveError(service: Service, isEdit: boolean, message: string): void {
    if (!isEdit) {
      this.services = this.services.filter(s => s.id !== service.id);
    }
    this.updateMetrics();
    this.toastService.show(message, 'error');
  }

  async onServiceDeleted(id: number): Promise<void> {
    const confirmed = await this.confirmService.danger(
      'Isso remove o serviço permanentemente. Deseja continuar?',
      'Excluir Serviço'
    );
    if (!confirmed) return;
    
    this.api.deleteService(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.services = this.services.filter(s => s.id !== id);
          this.updateMetrics();
          this.toastService.show('Serviço removido!', 'success');
        } else {
          this.toastService.show(response.message || 'Falha ao remover.', 'error');
        }
      },
      error: (err) => {
        console.error('Delete Error:', err);
        this.toastService.show('Erro de conexão ao remover serviço.', 'error');
      }
    });
  }

  onEmployeeSaved(employee: Employee): void {
    this.employees = [...this.employees.filter(e => e.id !== employee.id), employee];
    this.updateMetrics();
    this.toastService.show('Funcionário atualizado!', 'success');
  }

  onRoleSaved(role: Role): void {
    this.roles = [...this.roles.filter(r => r.id !== role.id), role];
    this.toastService.show('Cargo salvo!', 'success');
  }

  onAppointmentCancelled(): void {
    this.ngOnInit();
    this.toastService.show('Agendamento cancelado!', 'success');
  }

  onCompanyUpdated(): void {
    const companyId = this.companyId;
    if (!companyId) {
      this.handleLoadError('ID da empresa inválido após atualização.');
      return;
    }
    this.api.getCompany(companyId).subscribe({
      next: (response) => {
        if (response.success === true && response.data) {
          const data = response.data as CompanyDto;
          this.companyForm.patchValue(data);
          if (data.operatingHours) {
            const [start, end] = data.operatingHours.split('-');
            this.companyForm.patchValue({ startTime: start?.trim() || '10:00', endTime: end?.trim() || '18:00' });
          }
          this.cdr.detectChanges();
          this.toastService.show('Empresa atualizada com sucesso!', 'success');
        } else {
          this.handleLoadError('Falha ao recarregar dados da empresa.');
        }
      },
      error: (err) => {
        console.error('Erro ao recarregar company:', err);
        this.toastService.show('Erro ao recarregar dados. Tente novamente.', 'error');
      }
    });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('companyId');
    this.router.navigate(['/login']);
  }

  // <<< FIX: Renomeado para getCompanyId() e retorna number diretamente
  private getCompanyId(): number {
    const idStr = localStorage.getItem('companyId');
    if (idStr) {
      const parsed = parseInt(idStr, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found');
      return 0;
    }
    try {
      const decoded: any = jwtDecode(token);
      const role = decoded['http://schemas.microsoft.com/ws/2005/05/identity/claims/role'] || decoded.role || '';
      if (role.toLowerCase() !== 'admin') {
        console.warn('Invalid role:', role);
        this.error = 'Acesso negado: Role inválida.';
        return 0;
      }
      const companyId = decoded.companyId ? parseInt(decoded.companyId, 10) : 0;
      if (companyId > 0) {
        localStorage.setItem('companyId', companyId.toString());
        return companyId;
      }
    } catch (e) {
      console.error('Token decode error:', e);
      this.error = 'Token inválido.';
    }
    return 0;
  }

  trackById(index: number, item: any): number { return item.id; }
  trackByName(index: number, item: ServiceReport): string { return item.name; }
}