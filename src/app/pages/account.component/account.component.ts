import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Appointment } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmService } from '../../services/confirm.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css']
})
export class AccountComponent implements OnInit {
  user: any = {};
  appointments: Appointment[] = [];
  loading = true;
  error = '';

  activeTab: 'today' | 'future' | 'past' = 'today';
  filterDate: string = '';
  filteredAppointments: Appointment[] = [];

  todayAppointments: Appointment[] = [];
  futureAppointments: Appointment[] = [];
  pastAppointments: Appointment[] = [];

  // MODAL: ESSA LINHA É OBRIGATÓRIA!
  selectedAppointment: Appointment | null = null;

  constructor(
    private api: ApiService, 
    private router: Router, 
    private toast: ToastService,
    private confirmService: ConfirmService
  ) {}

  ngOnInit(): void {
    this.loadUser();
    if (this.user.id) {
      this.loadAppointments();
    } else {
      this.loading = false;
    }
  }

  loadUser(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.user = JSON.parse(userData);
    } else {
      this.user = { name: 'Usuário', email: '' };
      this.error = 'Faça login para ver seus dados.';
    }
  }

  public loadAppointments(): void {
    this.loading = true;
    this.error = '';
    const companyId = this.user.companyId && this.user.companyId > 0 ? this.user.companyId : undefined;

    this.api.getMyAppointments(companyId).subscribe({
      next: (response) => {
        if (response.success) {
          this.appointments = response.data || [];
          this.categorizeAppointments();
        } else {
          this.error = response.message || 'Erro ao carregar agendamentos.';
        }
        this.loading = false;
      },
      error: () => {
        this.error = 'Falha na conexão.';
        this.loading = false;
      }
    });
  }

  private categorizeAppointments(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.todayAppointments = this.appointments.filter(a => {
      const d = new Date(a.startDateTime);
      return d >= today && d < tomorrow;
    });
    this.futureAppointments = this.appointments.filter(a => new Date(a.startDateTime) >= tomorrow);
    this.pastAppointments = this.appointments.filter(a => new Date(a.startDateTime) < today);

    this.applyFilter();
  }

  applyFilter(): void {
    let list: Appointment[] = [];
    if (this.activeTab === 'today') list = [...this.todayAppointments];
    else if (this.activeTab === 'future') list = [...this.futureAppointments];
    else list = [...this.pastAppointments];

    if (this.filterDate) {
      const f = new Date(this.filterDate);
      f.setHours(0, 0, 0, 0);
      const next = new Date(f);
      next.setDate(next.getDate() + 1);
      list = list.filter(a => {
        const d = new Date(a.startDateTime);
        return d >= f && d < next;
      });
    }
    this.filteredAppointments = list;
  }

  clearFilter(): void {
    this.filterDate = '';
    this.applyFilter();
  }

  reloadData(): void {
    this.loadUser();
    if (this.user.id) this.loadAppointments();
  }

  goBackToHub(): void { this.router.navigate(['/hub']); }
  goToLogin(): void { this.router.navigate(['/login']); }

  async cancelAppointment(id: number): Promise<void> {
    try {
      const confirmed = await this.confirmService.confirm({
        title: 'Cancelar Agendamento',
        message: 'Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.',
        confirmText: 'Sim, cancelar',
        cancelText: 'Não',
        type: 'danger'
      });
      
      if (!confirmed) {
        return; // Usuário cancelou a confirmação
      }
      
      this.api.cancelAppointment(id).subscribe({
        next: (response) => {
          if (response && response.success !== false) {
            this.loadAppointments();
            this.selectedAppointment = null;
            this.toast.success('Agendamento cancelado com sucesso! ✅');
          } else {
            const errorMsg = response?.message || 'Não foi possível cancelar o agendamento.';
            this.toast.error(errorMsg);
            console.error('Erro na resposta:', response);
          }
        },
        error: (err) => {
          console.error('Erro ao cancelar agendamento:', err);
          let errorMessage = 'Erro ao cancelar agendamento.';
          
          if (err?.error?.message) {
            errorMessage = err.error.message;
          } else if (err?.message) {
            errorMessage = err.message;
          } else if (err?.status === 401) {
            errorMessage = 'Você não tem permissão para cancelar este agendamento.';
          } else if (err?.status === 404) {
            errorMessage = 'Agendamento não encontrado.';
          } else if (err?.status >= 500) {
            errorMessage = 'Erro interno do servidor. Tente novamente mais tarde.';
          }
          
          this.toast.error(errorMessage);
        }
      });
    } catch (error) {
      console.error('Erro ao exibir confirmação:', error);
      this.toast.error('Erro ao processar cancelamento. Tente novamente. ❌');
    }
  }

  // ABRE O MODAL COM OS DETALHES
  viewDetails(appt: Appointment): void {
    this.selectedAppointment = appt;
  }

  trackByAppointmentId(_: number, appt: Appointment): number {
    return appt.id;
  }

  // VERIFICA SE JÁ PASSOU DO HORÁRIO
  isAlreadyDone(appt: Appointment): boolean {
    const now = new Date();
    const end = appt.endDateTime
      ? new Date(appt.endDateTime)
      : new Date(new Date(appt.startDateTime).getTime() + (appt.totalDurationMinutes || 60) * 60000);
    return end < now;
  }

  // LABEL DO STATUS
  getStatusLabel(appt: Appointment): string {
    if (this.isAlreadyDone(appt) && (appt.status === 'Scheduled' || appt.status === 'Confirmed')) {
      return 'Realizado';
    }
    const map: Record<string, string> = {
      'Scheduled': 'Agendado',
      'Confirmed': 'Confirmado',
      'Cancelled': 'Cancelado'
    };
    return map[appt.status] || appt.status;
  }

  // CLASSE DO STATUS
  getStatusClass(appt: Appointment): string {
    if (this.isAlreadyDone(appt) && (appt.status === 'Scheduled' || appt.status === 'Confirmed')) {
      return 'bg-slate-600 text-white';
    }
    const map: Record<string, string> = {
      'Scheduled': 'bg-yellow-100 text-yellow-800',
      'Confirmed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };
    return map[appt.status] || 'bg-gray-100 text-gray-800';
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

  // CALCULA O PREÇO TOTAL DO AGENDAMENTO
  getTotalPrice(appt: Appointment): number {
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

  // FORMATA O PREÇO PARA EXIBIÇÃO
  formatPrice(price: number): string {
    return price.toFixed(2).replace('.', ',');
  }
}