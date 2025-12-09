import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService, Appointment } from '../../../services/api.service';
import { ConfirmService } from '../../../services/confirm.service';
import { ToastService } from '../../../services/toast.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface LocalAppointment extends Appointment {
  dateTime: Date;
}

interface Employee {
  id: number;
  name: string;
  role?: string;
  avatarUrl?: string;
}

interface DayMetrics {
  totalAppointments: number;
  totalRevenue: number;
  topService: { name: string; count: number } | null;
  topEmployee: { name: string; count: number } | null;
  occupancyRate: number;
}

@Component({
  selector: 'app-agenda-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './agenda-tab.component.html',
  styleUrls: ['./agenda-tab.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgendaTabComponent implements OnInit, OnChanges {
  @Input() companyId!: number;
  @Input() operatingHours: string = '08:00-18:00';
  @Output() apptCancelled = new EventEmitter<void>();

  // Data
  selectedDate = new Date();
  hours: string[] = [];
  employees: Employee[] = [];
  allAppointments: LocalAppointment[] = [];
  dayMetrics: DayMetrics = {
    totalAppointments: 0,
    totalRevenue: 0,
    topService: null,
    topEmployee: null,
    occupancyRate: 0
  };

  // UI State
  loading = false;
  isToday = true;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private confirmService: ConfirmService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.generateHoursFromOperatingHours();
    if (this.companyId) {
      this.loadData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['operatingHours']) {
      this.generateHoursFromOperatingHours();
    }
    if (changes['companyId'] && this.companyId) {
      this.loadData();
    }
  }

  private generateHoursFromOperatingHours(): void {
    const [start, end] = this.operatingHours?.split('-') || ['08:00', '18:00'];
    const startHour = parseInt(start?.split(':')[0] || '8', 10);
    const endHour = parseInt(end?.split(':')[0] || '18', 10);

    this.hours = [];
    for (let h = startHour; h <= endHour; h++) {
      this.hours.push(`${h.toString().padStart(2, '0')}:00`);
    }
  }

  private loadData(): void {
    this.loading = true;
    this.checkIsToday();

    const dateStr = this.selectedDate.toISOString().split('T')[0];

    // Carregar funcionários e agendamentos em paralelo
    this.api.getEmployees(this.companyId).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.employees = res.data;
        }
        this.loadAppointments(dateStr);
      },
      error: () => {
        this.employees = [];
        this.loadAppointments(dateStr);
      }
    });
  }

  private loadAppointments(dateStr: string): void {
    this.api.getAppointmentsWeek({ start: dateStr, end: dateStr, companyId: this.companyId }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.allAppointments = res.data
            .map((a: Appointment) => ({
              ...a,
              dateTime: new Date(a.startDateTime),
            }))
            .filter((a: LocalAppointment) => a.status !== 'Cancelled') as LocalAppointment[];
          
          // Debug: verificar dados carregados
          console.log('Agendamentos carregados:', this.allAppointments.length);
          console.log('Funcionários:', this.employees.length);
          if (this.allAppointments.length > 0) {
            console.log('Primeiro agendamento:', {
              employee: this.allAppointments[0].employee,
              dateTime: this.allAppointments[0].dateTime,
              hour: this.allAppointments[0].dateTime.getHours()
            });
          }
          
          this.calculateMetrics();
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao carregar agendamentos:', err);
        this.allAppointments = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private calculateMetrics(): void {
    const appointments = this.allAppointments;

    // Total de agendamentos
    this.dayMetrics.totalAppointments = appointments.length;

    // Total faturado
    this.dayMetrics.totalRevenue = appointments.reduce((sum, appt) => {
      return sum + this.getServicePriceNumber(appt);
    }, 0);

    // Serviço mais utilizado
    const serviceCount: { [key: string]: number } = {};
    appointments.forEach(appt => {
      const serviceName = this.getServiceName(appt);
      serviceCount[serviceName] = (serviceCount[serviceName] || 0) + 1;
    });
    const topServiceEntry = Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0];
    this.dayMetrics.topService = topServiceEntry ? { name: topServiceEntry[0], count: topServiceEntry[1] } : null;

    // Funcionário mais ativo
    const employeeCount: { [key: string]: number } = {};
    appointments.forEach(appt => {
      const empName = appt.employee?.name || 'N/A';
      employeeCount[empName] = (employeeCount[empName] || 0) + 1;
    });
    const topEmpEntry = Object.entries(employeeCount).sort((a, b) => b[1] - a[1])[0];
    this.dayMetrics.topEmployee = topEmpEntry ? { name: topEmpEntry[0], count: topEmpEntry[1] } : null;

    // Taxa de ocupação (slots ocupados / total de slots possíveis)
    const totalSlots = this.employees.length * this.hours.length;
    const occupiedSlots = appointments.length;
    this.dayMetrics.occupancyRate = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;
  }

  private checkIsToday(): void {
    const today = new Date();
    this.isToday = this.selectedDate.toDateString() === today.toDateString();
  }

  // Navegação
  prevDay(): void {
    this.selectedDate = new Date(this.selectedDate.getTime() - 24 * 60 * 60 * 1000);
    this.loadData();
  }

  nextDay(): void {
    this.selectedDate = new Date(this.selectedDate.getTime() + 24 * 60 * 60 * 1000);
    this.loadData();
  }

  goToToday(): void {
    this.selectedDate = new Date();
    this.loadData();
  }

  // Formatação de data
  get formattedDate(): string {
    return this.selectedDate.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  // Buscar agendamentos para um funcionário em um horário específico
  getAppointmentForSlot(employeeId: number, hourStr: string): LocalAppointment | null {
    const hour = parseInt(hourStr.split(':')[0], 10);
    const selectedDateStr = this.selectedDate.toISOString().split('T')[0];
    
    // Encontra o funcionário para comparar por ID ou nome
    const employee = this.employees.find(e => e.id === employeeId);
    
    return this.allAppointments.find(appt => {
      // Verifica se é do dia selecionado
      const apptDateStr = appt.dateTime.toISOString().split('T')[0];
      if (apptDateStr !== selectedDateStr) return false;
      
      // Verifica se o agendamento é do funcionário correto (por ID ou nome como fallback)
      const empMatch = appt.employee?.id === employeeId || 
                      (employee && appt.employee?.name === employee.name);
      if (!empMatch) return false;
      
      // Verifica se o horário do agendamento corresponde ao slot
      const apptHour = appt.dateTime.getHours();
      
      // Agendamento que começa neste horário
      if (apptHour === hour) {
        return true;
      }
      
      // Agendamento que começou antes e ainda está ocupando este slot
      if (apptHour < hour) {
        const duration = this.getServiceDuration(appt);
        const endTime = new Date(appt.dateTime.getTime() + duration * 60000);
        const endHour = endTime.getHours();
        // Se o agendamento termina depois deste horário, ele ocupa este slot
        return endHour > hour || (endHour === hour && endTime.getMinutes() > 0);
      }
      
      return false;
    }) || null;
  }

  // Verifica se um slot está ocupado por um agendamento que começou antes
  isSlotOccupiedByPrevious(employeeId: number, hourStr: string): LocalAppointment | null {
    const hour = parseInt(hourStr.split(':')[0], 10);
    const selectedDateStr = this.selectedDate.toISOString().split('T')[0];
    
    return this.allAppointments.find(appt => {
      // Verifica se é do dia selecionado
      const apptDateStr = appt.dateTime.toISOString().split('T')[0];
      if (apptDateStr !== selectedDateStr) return false;
      
      // Verifica se é do funcionário correto
      if (appt.employee?.id !== employeeId) return false;
      
      const apptHour = appt.dateTime.getHours();
      
      // Só mostra como "continuação" se o agendamento começou ANTES deste horário
      // e ainda está ocupando este slot (mas não começou neste horário)
      if (apptHour < hour) {
        const duration = this.getServiceDuration(appt);
        const endTime = new Date(appt.dateTime.getTime() + duration * 60000);
        const endHour = endTime.getHours();
        // Se o agendamento termina depois deste horário, ele ocupa este slot
        return endHour > hour || (endHour === hour && endTime.getMinutes() > 0);
      }
      
      return false;
    }) || null;
  }

  // Calcula quantos slots um agendamento ocupa
  getSlotSpan(appt: LocalAppointment): number {
    const duration = this.getServiceDuration(appt);
    return Math.max(1, Math.ceil(duration / 60));
  }

  // Helper methods para serviços
  getServiceName(appt: LocalAppointment): string {
    if (appt.services && Array.isArray(appt.services) && appt.services.length > 0) {
      return appt.services.map((s: any) => s.name).join(', ');
    }
    if (appt.service?.name) {
      return appt.service.name;
    }
    return 'Serviço';
  }

  getServiceDuration(appt: LocalAppointment): number {
    if (appt.totalDurationMinutes) {
      return appt.totalDurationMinutes;
    }
    if (appt.services && Array.isArray(appt.services) && appt.services.length > 0) {
      return appt.services.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
    }
    if (appt.service?.duration) {
      return appt.service.duration;
    }
    return 60;
  }

  getServicePriceNumber(appt: LocalAppointment): number {
    if (appt.services && Array.isArray(appt.services) && appt.services.length > 0) {
      return appt.services.reduce((sum: number, s: any) => sum + (s.price || 0), 0);
    }
    if (appt.service?.price) {
      return appt.service.price;
    }
    return 0;
  }

  getServicePrice(appt: LocalAppointment): string {
    return this.getServicePriceNumber(appt).toFixed(2);
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Confirmed': return '✅';
      case 'Scheduled': return '🕐';
      case 'Cancelled': return '❌';
      default: return '🕐';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Confirmed': return 'bg-emerald-100 border-emerald-300 text-emerald-800';
      case 'Scheduled': return 'bg-amber-100 border-amber-300 text-amber-800';
      case 'Cancelled': return 'bg-red-100 border-red-300 text-red-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  }

  async cancelAppointment(appt: LocalAppointment, event: Event): Promise<void> {
    event.stopPropagation();
    
    const confirmed = await this.confirmService.danger(
      'Deseja cancelar este agendamento?',
      'Cancelar Agendamento'
    );

    if (confirmed) {
      this.api.cancelAppointment(appt.id).subscribe({
        next: (res) => {
          if (res.success) {
            this.loadData();
            this.apptCancelled.emit();
            this.toast.success('Agendamento cancelado! ✅');
          }
        },
        error: () => this.toast.error('Erro ao cancelar. ❌')
      });
    }
  }

  canCancel(appt: LocalAppointment): boolean {
    if (appt.status === 'Cancelled') return false;
    const now = new Date();
    const end = appt.endDateTime
      ? new Date(appt.endDateTime)
      : new Date(appt.dateTime.getTime() + this.getServiceDuration(appt) * 60000);
    return end > now;
  }

  exportCalendar(): void {
    const element = document.getElementById('calendar-section');
    if (element) {
      html2canvas(element).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('landscape');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        const fileName = `agenda_${this.selectedDate.toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
      });
    }
  }

  // Iniciais do funcionário para avatar
  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  // Cor do avatar baseada no nome
  getAvatarColor(name: string): string {
    const colors = [
      'bg-pink-500', 'bg-purple-500', 'bg-indigo-500', 'bg-blue-500',
      'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-orange-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }
}
