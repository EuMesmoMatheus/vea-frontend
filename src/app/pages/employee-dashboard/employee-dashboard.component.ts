import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, Employee, EmployeeAppointment, EmployeeAppointmentsResponse } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './employee-dashboard.component.html',
  styleUrls: ['./employee-dashboard.component.css']
})
export class EmployeeDashboardComponent implements OnInit {
  // Dados do prestador
  employee: Employee | null = null;
  
  // Controle de visualização
  activeView: 'today' | 'week' | 'month' = 'today';
  showProfile = false;
  
  // Dados de agendamentos
  appointmentsData: EmployeeAppointmentsResponse | null = null;
  appointments: EmployeeAppointment[] = [];
  
  // Controle de expansão dos cards
  expandedAppointments: Set<number> = new Set();
  
  // Loading states
  loading = true;
  loadingAppointments = false;
  
  // Controle de data para navegação
  selectedDate = new Date();
  
  constructor(
    private api: ApiService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.loadAppointments();
  }

  // ==================== PERFIL ====================
  loadProfile(): void {
    this.api.getEmployeeProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.employee = res.data;
        }
        this.loading = false;
      },
      error: () => {
        this.toast.error('Erro ao carregar perfil');
        this.loading = false;
      }
    });
  }

  toggleProfile(): void {
    this.showProfile = !this.showProfile;
  }

  // ==================== AGENDAMENTOS ====================
  loadAppointments(): void {
    this.loadingAppointments = true;
    
    switch (this.activeView) {
      case 'today':
        this.api.getEmployeeAppointmentsToday().subscribe({
          next: (res) => this.handleAppointmentsResponse(res),
          error: () => this.handleAppointmentsError()
        });
        break;
        
      case 'week':
        const weekDate = this.selectedDate.toISOString().split('T')[0];
        this.api.getEmployeeAppointmentsWeek(weekDate).subscribe({
          next: (res) => this.handleAppointmentsResponse(res),
          error: () => this.handleAppointmentsError()
        });
        break;
        
      case 'month':
        const year = this.selectedDate.getFullYear();
        const month = this.selectedDate.getMonth() + 1;
        this.api.getEmployeeAppointmentsMonth(year, month).subscribe({
          next: (res) => this.handleAppointmentsResponse(res),
          error: () => this.handleAppointmentsError()
        });
        break;
    }
  }

  private handleAppointmentsResponse(res: any): void {
    if (res.success && res.data) {
      this.appointmentsData = res.data;
      this.appointments = res.data.appointments || [];
    } else {
      this.appointments = [];
      this.appointmentsData = null;
    }
    this.loadingAppointments = false;
  }

  private handleAppointmentsError(): void {
    this.toast.error('Erro ao carregar agendamentos');
    this.appointments = [];
    this.loadingAppointments = false;
  }

  changeView(view: 'today' | 'week' | 'month'): void {
    this.activeView = view;
    this.selectedDate = new Date();
    this.expandedAppointments.clear();
    this.loadAppointments();
  }

  // ==================== NAVEGAÇÃO DE PERÍODO ====================
  prevPeriod(): void {
    if (this.activeView === 'week') {
      this.selectedDate.setDate(this.selectedDate.getDate() - 7);
    } else if (this.activeView === 'month') {
      this.selectedDate.setMonth(this.selectedDate.getMonth() - 1);
    }
    this.selectedDate = new Date(this.selectedDate);
    this.loadAppointments();
  }

  nextPeriod(): void {
    if (this.activeView === 'week') {
      this.selectedDate.setDate(this.selectedDate.getDate() + 7);
    } else if (this.activeView === 'month') {
      this.selectedDate.setMonth(this.selectedDate.getMonth() + 1);
    }
    this.selectedDate = new Date(this.selectedDate);
    this.loadAppointments();
  }

  getPeriodLabel(): string {
    if (this.activeView === 'today') {
      return this.selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    } else if (this.activeView === 'week' && this.appointmentsData) {
      return `${this.formatDate(this.appointmentsData.startDate)} - ${this.formatDate(this.appointmentsData.endDate)}`;
    } else if (this.activeView === 'month') {
      return this.selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
    return '';
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  }

  // ==================== EXPANSÃO DOS CARDS ====================
  toggleExpand(id: number): void {
    if (this.expandedAppointments.has(id)) {
      this.expandedAppointments.delete(id);
    } else {
      this.expandedAppointments.add(id);
    }
  }

  isExpanded(id: number): boolean {
    return this.expandedAppointments.has(id);
  }

  // ==================== HELPERS ====================
  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      'Scheduled': 'Agendado',
      'Confirmed': 'Confirmado',
      'Cancelled': 'Cancelado',
      'Completed': 'Concluído'
    };
    return map[status] || status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Scheduled': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Confirmed': 'bg-green-100 text-green-800 border-green-300',
      'Cancelled': 'bg-red-100 text-red-800 border-red-300',
      'Completed': 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return map[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  }

  getStatusIcon(status: string): string {
    const map: Record<string, string> = {
      'Scheduled': '⏳',
      'Confirmed': '✅',
      'Cancelled': '❌',
      'Completed': '🎉'
    };
    return map[status] || '📅';
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  formatFullDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  getTotalPrice(services: Array<{ price?: number }>): number {
    return services.reduce((sum, s) => sum + (s.price || 0), 0);
  }

  // ==================== AÇÕES ====================
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  goToHub(): void {
    this.router.navigate(['/hub']);
  }
}


