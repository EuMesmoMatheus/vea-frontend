import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, Employee, EmployeeAppointment, EmployeeAppointmentsResponse } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

interface DayAppointments {
  date: string;
  dateLabel: string;
  dayLabel: string;
  appointments: EmployeeAppointment[];
}

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  dayAppointments: DayAppointments[] = []; // Para visualização semanal
  
  // Horários de trabalho
  operatingHours: { start: string; end: string } = { start: '08:00', end: '18:00' };
  hours: string[] = [];
  
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
    this.generateHours();
  }

  // ==================== PERFIL ====================
  loadProfile(): void {
    console.log('[EmployeeDashboard] Carregando perfil...');
    this.api.getEmployeeProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.employee = res.data;
          // Tentar buscar horário de funcionamento da empresa
          this.loadCompanyOperatingHours();
        } else if (res && !res.success && (res as any).id) {
          this.employee = res as any;
          this.loadCompanyOperatingHours();
        }
        this.loading = false;
        this.loadAppointments();
      },
      error: (err) => {
        console.error('[EmployeeDashboard] Erro ao carregar perfil:', err);
        this.toast.error('Erro ao carregar perfil');
        this.loading = false;
      }
    });
  }

  private loadCompanyOperatingHours(): void {
    // Se o employee tiver companyId, buscar horários
    if (this.employee && (this.employee as any).companyId) {
      this.api.getCompany((this.employee as any).companyId).subscribe({
        next: (res) => {
          if (res.success && res.data?.operatingHours) {
            const [start, end] = res.data.operatingHours.split('-');
            this.operatingHours = {
              start: start?.trim() || '08:00',
              end: end?.trim() || '18:00'
            };
            this.generateHours();
          }
        },
        error: () => {
          // Usa horário padrão
          this.operatingHours = { start: '08:00', end: '18:00' };
          this.generateHours();
        }
      });
    } else {
      this.generateHours();
    }
  }

  private generateHours(): void {
    const [startHour, startMin] = this.operatingHours.start.split(':').map(Number);
    const [endHour, endMin] = this.operatingHours.end.split(':').map(Number);
    
    this.hours = [];
    for (let h = startHour; h <= endHour; h++) {
      this.hours.push(`${h.toString().padStart(2, '0')}:00`);
    }
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
        // Corrigir: usar formato correto de data
        const weekStart = this.getWeekStart(this.selectedDate);
        const weekDate = this.formatDateForAPI(weekStart);
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
      
      // Para visualização semanal, organizar por dia
      if (this.activeView === 'week') {
        this.organizeWeekAppointments();
      }
    } else {
      this.appointments = [];
      this.appointmentsData = null;
      this.dayAppointments = [];
    }
    this.loadingAppointments = false;
  }

  private organizeWeekAppointments(): void {
    const weekStart = this.getWeekStart(this.selectedDate);
    this.dayAppointments = [];
    
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + i);
      
      const dateStr = this.formatDateForAPI(dayDate);
      const dayAppts = this.appointments.filter(apt => {
        const aptDate = new Date(apt.startDateTime);
        const aptDateStr = this.formatDateForAPI(aptDate);
        return aptDateStr === dateStr;
      });
      
      this.dayAppointments.push({
        date: dateStr,
        dateLabel: dayDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }),
        dayLabel: dayDate.toLocaleDateString('pt-BR', { weekday: 'short' }),
        appointments: dayAppts
      });
    }
  }

  private handleAppointmentsError(): void {
    this.toast.error('Erro ao carregar agendamentos');
    this.appointments = [];
    this.dayAppointments = [];
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
      this.selectedDate = new Date(this.selectedDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (this.activeView === 'month') {
      this.selectedDate = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth() - 1, 1);
    }
    this.loadAppointments();
  }

  nextPeriod(): void {
    if (this.activeView === 'week') {
      this.selectedDate = new Date(this.selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (this.activeView === 'month') {
      this.selectedDate = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth() + 1, 1);
    }
    this.loadAppointments();
  }

  getPeriodLabel(): string {
    if (this.activeView === 'today') {
      return this.selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    } else if (this.activeView === 'week') {
      const weekStart = this.getWeekStart(this.selectedDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${weekStart.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`;
    } else if (this.activeView === 'month') {
      return this.selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
    return '';
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Domingo = 0
    return new Date(d.setDate(diff));
  }

  private formatDateForAPI(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ==================== GRADE DE HORÁRIOS ====================
  /**
   * Retorna o agendamento que começa neste horário específico
   * (não retorna se só está ocupando por ter começado antes)
   */
  getAppointmentForSlot(hourStr: string, appointments: EmployeeAppointment[]): EmployeeAppointment | null {
    const hour = parseInt(hourStr.split(':')[0], 10);
    return appointments.find(appt => {
      const apptDate = new Date(appt.startDateTime);
      const apptHour = apptDate.getHours();
      const apptMinutes = apptDate.getMinutes();
      
      // Agendamento que começa exatamente neste horário (ou nos primeiros minutos)
      return apptHour === hour && apptMinutes < 30;
    }) || null;
  }

  /**
   * Verifica se um slot está ocupado por um agendamento que começou antes
   * Retorna o agendamento se ele está ocupando este slot mas não começou nele
   */
  isSlotOccupiedByPrevious(hourStr: string, appointments: EmployeeAppointment[]): EmployeeAppointment | null {
    const hour = parseInt(hourStr.split(':')[0], 10);
    return appointments.find(appt => {
      const apptDate = new Date(appt.startDateTime);
      const apptHour = apptDate.getHours();
      const apptMinutes = apptDate.getMinutes();
      
      // Se começou neste horário (ou depois), não é "previous"
      if (apptHour > hour || (apptHour === hour && apptMinutes >= 30)) {
        return false;
      }
      
      // Calcular quando termina baseado na duração total
      const duration = this.getServiceDuration(appt);
      const endTime = new Date(apptDate.getTime() + duration * 60000);
      const endHour = endTime.getHours();
      const endMinutes = endTime.getMinutes();
      
      // Verifica se o agendamento ainda está ocupando este slot
      // Se termina depois deste horário, está ocupando
      if (endHour > hour) {
        return true;
      }
      // Se termina neste horário mas ainda tem minutos, está ocupando
      if (endHour === hour && endMinutes > 0) {
        return true;
      }
      
      return false;
    }) || null;
  }

  /**
   * Calcula quantos slots (horas) um agendamento ocupa
   */
  getSlotSpan(appt: EmployeeAppointment): number {
    const duration = this.getServiceDuration(appt);
    return Math.max(1, Math.ceil(duration / 60));
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
    if (!services || !Array.isArray(services) || services.length === 0) {
      return 0;
    }
    return services.reduce((sum, s) => {
      if (!s) return sum;
      const price = s.price !== undefined && s.price !== null ? parseFloat(String(s.price)) : 0;
      return sum + (isNaN(price) ? 0 : price);
    }, 0);
  }

  getServiceDuration(appt: EmployeeAppointment): number {
    return appt.totalDurationMinutes || appt.services.reduce((sum, s) => sum + (s.duration || 0), 0);
  }

  trackByAppointmentId(index: number, appt: EmployeeAppointment): number {
    return appt.id;
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
