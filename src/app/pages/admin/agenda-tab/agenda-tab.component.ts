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

    // Formata data no formato YYYY-MM-DD (sem timezone issues)
    const year = this.selectedDate.getFullYear();
    const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(this.selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    console.log('📅 Data selecionada:', {
      original: this.selectedDate,
      formatted: dateStr,
      companyId: this.companyId
    });

    // Carregar funcionários e agendamentos em paralelo
    this.api.getEmployees(this.companyId).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.employees = res.data;
          console.log('👥 Funcionários carregados:', this.employees.length, this.employees);
        } else {
          console.warn('⚠️ Erro ao carregar funcionários:', res);
        }
        this.loadAppointments(dateStr);
      },
      error: (err) => {
        console.error('❌ Erro ao carregar funcionários:', err);
        this.employees = [];
        this.loadAppointments(dateStr);
      }
    });
  }

  private loadAppointments(dateStr: string): void {
    // A API de semana espera um range (start/end). Vamos buscar a semana inteira e filtrar o dia localmente.
    const { start, end } = this.getWeekRange(this.selectedDate);
    console.log('🔍 Buscando agendamentos (semana):', { start, end, companyId: this.companyId, diaSelecionado: dateStr });
    
    this.api.getAppointmentsWeek({ start, end, companyId: this.companyId }).subscribe({
      next: (res) => {
        console.log('📦 Resposta completa da API:', res);
        
        if (res.success && res.data) {
          // Garantir que res.data é um array
          const appointmentsArray = Array.isArray(res.data) ? res.data : [];
          console.log('✅ Dados recebidos:', appointmentsArray.length, 'agendamentos');
          
          if (appointmentsArray.length > 0) {
            console.log('📋 Primeiro agendamento recebido:', appointmentsArray[0]);
          }
          
          // Mapear agendamentos
          const mapped = appointmentsArray.map((a: Appointment) => {
            const dateTime = new Date(a.startDateTime);
            return {
              ...a,
              dateTime: dateTime
            };
          }) as LocalAppointment[];
          
          console.log('📋 Agendamentos mapeados:', mapped.length);
          
          // Filtrar apenas do dia selecionado e não cancelados
          // Usar comparação de data local para evitar problemas de timezone
          const selectedDateObj = new Date(dateStr + 'T00:00:00');
          const selectedDateStr = this.formatDateForComparison(selectedDateObj);
          
          this.allAppointments = mapped.filter((a: LocalAppointment) => {
            const apptDateStr = this.formatDateForComparison(a.dateTime);
            const isSameDay = apptDateStr === selectedDateStr;
            const isNotCancelled = a.status !== 'Cancelled';
            
            if (!isSameDay && appointmentsArray.length <= 5) {
              console.log('⏭️ Agendamento ignorado (dia diferente):', {
                apptDate: apptDateStr,
                selectedDate: selectedDateStr,
                appointmentId: a.id,
                startDateTime: a.startDateTime
              });
            }
            
            return isSameDay && isNotCancelled;
          }) as LocalAppointment[];
          
          // Debug: verificar dados carregados
          console.log('📊 Agendamentos finais (após filtros):', this.allAppointments.length);
          
          if (this.allAppointments.length > 0) {
            console.log('📝 Primeiro agendamento final:', {
              id: this.allAppointments[0].id,
              employee: this.allAppointments[0].employee,
              employeeId: this.allAppointments[0].employee?.id,
              dateTime: this.allAppointments[0].dateTime,
              hour: this.allAppointments[0].dateTime.getHours(),
              status: this.allAppointments[0].status,
              services: this.allAppointments[0].services,
              service: this.allAppointments[0].service
            });
          } else {
            console.warn('⚠️ Nenhum agendamento encontrado para o dia:', dateStr);
            if (appointmentsArray.length > 0) {
              console.log('🔍 Todos os agendamentos recebidos (primeiros 3):', appointmentsArray.slice(0, 3));
            }
          }
          
          this.calculateMetrics();
        } else {
          console.warn('⚠️ Resposta sem sucesso ou sem dados:', { 
            success: res.success, 
            hasData: !!res.data,
            message: res.message 
          });
          this.allAppointments = [];
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Erro ao carregar agendamentos:', err);
        this.allAppointments = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private getWeekRange(date: Date): { start: string; end: string } {
    const d = new Date(date);
    const day = d.getDay(); // Domingo = 0
    const startDate = new Date(d);
    startDate.setDate(d.getDate() - day);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    return {
      start: this.formatDateForComparison(startDate),
      end: this.formatDateForComparison(endDate)
    };
  }

  private formatDateForComparison(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    const selectedDateStr = this.formatDateForComparison(this.selectedDate);
    
    // Encontra o funcionário para comparar por ID ou nome
    const employee = this.employees.find(e => e.id === employeeId);
    
    return this.allAppointments.find(appt => {
      // Verifica se é do dia selecionado (usando formatação local)
      const apptDateStr = this.formatDateForComparison(appt.dateTime);
      if (apptDateStr !== selectedDateStr) return false;
      
      // Verifica se o agendamento é do funcionário correto (por ID ou nome como fallback)
      const empMatch = appt.employee?.id === employeeId || 
                      (employee && appt.employee?.name === employee.name);
      if (!empMatch) {
        // Debug apenas se não encontrar
        if (this.allAppointments.length <= 5) {
          console.log('🔍 Funcionário não corresponde:', {
            apptEmployeeId: appt.employee?.id,
            targetEmployeeId: employeeId,
            apptEmployeeName: appt.employee?.name,
            targetEmployeeName: employee?.name
          });
        }
        return false;
      }
      
      // Verifica se o horário do agendamento corresponde ao slot
      const apptHour = appt.dateTime.getHours();
      const apptMinutes = appt.dateTime.getMinutes();
      
      // Agendamento que começa neste horário (ou nos primeiros minutos)
      if (apptHour === hour && apptMinutes < 30) {
        return true;
      }
      
      // Agendamento que começou antes e ainda está ocupando este slot
      if (apptHour < hour) {
        const duration = this.getServiceDuration(appt);
        const endTime = new Date(appt.dateTime.getTime() + duration * 60000);
        const endHour = endTime.getHours();
        const endMinutes = endTime.getMinutes();
        // Se o agendamento termina depois deste horário, ele ocupa este slot
        return endHour > hour || (endHour === hour && endMinutes > 0);
      }
      
      return false;
    }) || null;
  }

  // Verifica se um slot está ocupado por um agendamento que começou antes
  isSlotOccupiedByPrevious(employeeId: number, hourStr: string): LocalAppointment | null {
    const hour = parseInt(hourStr.split(':')[0], 10);
    const selectedDateStr = this.formatDateForComparison(this.selectedDate);
    
    return this.allAppointments.find(appt => {
      // Verifica se é do dia selecionado
      const apptDateStr = this.formatDateForComparison(appt.dateTime);
      if (apptDateStr !== selectedDateStr) return false;
      
      // Verifica se é do funcionário correto
      if (appt.employee?.id !== employeeId) return false;
      
      const apptHour = appt.dateTime.getHours();
      const apptMinutes = appt.dateTime.getMinutes();
      
      // Só mostra como "continuação" se o agendamento começou ANTES deste horário
      // e ainda está ocupando este slot (mas não começou neste horário)
      if (apptHour < hour || (apptHour === hour && apptMinutes >= 30)) {
        const duration = this.getServiceDuration(appt);
        const endTime = new Date(appt.dateTime.getTime() + duration * 60000);
        const endHour = endTime.getHours();
        const endMinutes = endTime.getMinutes();
        // Se o agendamento termina depois deste horário, ele ocupa este slot
        return endHour > hour || (endHour === hour && endMinutes > 0);
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
