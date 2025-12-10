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
          
          // Mapear agendamentos - API agora retorna dados consistentes
          const mapped = appointmentsArray.map((a: any) => {
            const dateTime = new Date(a.startDateTime);
            
            // API retorna services[] completo com price já como número
            // Não precisa mais normalizar - usar diretamente
            const normalized: any = {
              ...a,
              dateTime: dateTime
            };
            
            // Garantir que totalPrice seja número (já vem como número da API)
            if (a.totalPrice !== undefined && a.totalPrice !== null) {
              normalized.totalPrice = typeof a.totalPrice === 'number' ? a.totalPrice : parseFloat(String(a.totalPrice)) || 0;
            }
            
            // Garantir que services[].price seja número (já vem como número da API)
            if (a.services && Array.isArray(a.services)) {
              normalized.services = a.services.map((s: any) => ({
                ...s,
                price: typeof s.price === 'number' ? s.price : parseFloat(String(s.price)) || 0
              }));
            }
            
            return normalized;
          }) as LocalAppointment[];
          
          console.log('📋 Agendamentos mapeados:', mapped.length);
          
          // Log do primeiro agendamento após normalização
          if (mapped.length > 0) {
            console.log('🔧 Primeiro agendamento NORMALIZADO:', JSON.stringify(mapped[0], null, 2));
            console.log('🔧 Serviços normalizados:', mapped[0].services);
            console.log('🔧 Serviço único normalizado:', mapped[0].service);
          }
          
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
            const firstAppt = this.allAppointments[0];
            console.log('📝 Primeiro agendamento final (COMPLETO):', JSON.stringify(firstAppt, null, 2));
            console.log('📝 Primeiro agendamento final (RESUMO):', {
              id: firstAppt.id,
              employee: firstAppt.employee,
              employeeId: firstAppt.employee?.id,
              dateTime: firstAppt.dateTime,
              hour: firstAppt.dateTime.getHours(),
              status: firstAppt.status,
              services: firstAppt.services,
              servicesType: Array.isArray(firstAppt.services) ? 'array' : typeof firstAppt.services,
              servicesLength: Array.isArray(firstAppt.services) ? firstAppt.services.length : 'N/A',
              service: firstAppt.service,
              servicesJson: firstAppt.servicesJson,
              servicesJsonType: typeof firstAppt.servicesJson,
              totalPrice: (firstAppt as any).totalPrice,
              price: (firstAppt as any).price,
              totalAmount: (firstAppt as any).totalAmount,
              calculatedPrice: this.getServicePriceNumber(firstAppt),
              calculatedServiceName: this.getServiceName(firstAppt)
            });
            
            // Log detalhado dos serviços
            if (firstAppt.services && Array.isArray(firstAppt.services)) {
              console.log('📋 Serviços (array):', firstAppt.services.map((s: any, i: number) => ({
                index: i,
                id: s?.id,
                name: s?.name,
                nameType: typeof s?.name,
                price: s?.price,
                priceType: typeof s?.price,
                duration: s?.duration,
                fullObject: s
              })));
            }
            
            if (firstAppt.service) {
              console.log('📋 Serviço único:', {
                id: firstAppt.service.id,
                name: firstAppt.service.name,
                nameType: typeof firstAppt.service.name,
                price: firstAppt.service.price,
                fullObject: firstAppt.service
              });
            }
            
            if (firstAppt.servicesJson) {
              try {
                const parsed = JSON.parse(firstAppt.servicesJson);
                console.log('📋 ServicesJson (parsed):', parsed);
              } catch (e) {
                console.error('❌ Erro ao parsear servicesJson:', e);
              }
            }
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
        // Log detalhado apenas em desenvolvimento ou para erros não-500
        if (err.status !== 500) {
          console.error('❌ Erro ao carregar agendamentos:', err);
          console.error('❌ Detalhes do erro:', {
            status: err.status,
            message: err.message,
            error: err.error,
            url: err.url
          });
        } else {
          // Para erro 500, log mais silencioso (problema conhecido do backend)
          console.warn('⚠️ Erro 500 ao carregar agendamentos da API - continuando sem dados');
        }
        
        // Em caso de erro, inicializar com array vazio para não quebrar a UI
        this.allAppointments = [];
        this.dayMetrics = {
          totalAppointments: 0,
          totalRevenue: 0,
          topService: null,
          topEmployee: null,
          occupancyRate: 0
        };
        
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

    // Total faturado - usa totalPrice diretamente ou calcula de services[]
    this.dayMetrics.totalRevenue = appointments.reduce((sum, appt) => {
      // Prioriza totalPrice (já vem como número da API)
      if (appt.totalPrice !== undefined && appt.totalPrice !== null) {
        return sum + (typeof appt.totalPrice === 'number' ? appt.totalPrice : parseFloat(String(appt.totalPrice)) || 0);
      }
      // Fallback: calcula de services[] (price já vem como número)
      if (appt.services && Array.isArray(appt.services) && appt.services.length > 0) {
        const total = appt.services.reduce((s: number, svc: any) => {
          if (!svc || svc.price === undefined || svc.price === null) return s;
          return s + (typeof svc.price === 'number' ? svc.price : parseFloat(String(svc.price)) || 0);
        }, 0);
        return sum + total;
      }
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
    
    return this.allAppointments.find(appt => {
      // Verifica se é do dia selecionado (usando formatação local)
      const apptDateStr = this.formatDateForComparison(appt.dateTime);
      if (apptDateStr !== selectedDateStr) return false;
      
      // Verifica se o agendamento é do funcionário correto (apenas por ID)
      if (appt.employee?.id !== employeeId) {
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
    // ✅ Prioridade: services[] (API retorna completo)
    if (appt.services && Array.isArray(appt.services) && appt.services.length > 0) {
      const serviceNames = appt.services
        .filter((s: any) => s && s.name && typeof s.name === 'string' && s.name.trim().length > 0)
        .map((s: any) => s.name.trim());
      
      if (serviceNames.length > 0) {
        return serviceNames.join(', ');
      }
    }
    
    // Fallback: service (objeto único)
    if (appt.service && appt.service.name && typeof appt.service.name === 'string' && appt.service.name.trim().length > 0) {
      return appt.service.name.trim();
    }
    
    return 'Serviço';
  }

  getServiceDuration(appt: LocalAppointment): number {
    // ✅ Prioridade 1: totalDurationMinutes (já vem da API)
    if (appt.totalDurationMinutes) {
      return appt.totalDurationMinutes;
    }
    
    // ✅ Prioridade 2: Calcular de services[] (duration já vem como número)
    if (appt.services && Array.isArray(appt.services) && appt.services.length > 0) {
      const total = appt.services.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
      if (total > 0) return total;
    }
    
    // Fallback: service único
    if (appt.service?.duration) {
      return appt.service.duration;
    }
    
    return 60; // Duração padrão
  }

  getServicePriceNumber(appt: LocalAppointment): number {
    // ✅ Prioridade 1: Usar totalPrice diretamente (já vem como número da API)
    if (appt.totalPrice !== undefined && appt.totalPrice !== null) {
      return typeof appt.totalPrice === 'number' ? appt.totalPrice : parseFloat(String(appt.totalPrice)) || 0;
    }
    
    // ✅ Prioridade 2: Calcular a partir de services[] (price já vem como número)
    if (appt.services && Array.isArray(appt.services) && appt.services.length > 0) {
      const total = appt.services.reduce((sum: number, s: any) => {
        if (!s || s.price === undefined || s.price === null) return sum;
        // Price já vem como número da API
        return sum + (typeof s.price === 'number' ? s.price : parseFloat(String(s.price)) || 0);
      }, 0);
      if (total > 0) return total;
    }
    
    // Fallback: tenta outros campos (compatibilidade)
    const apptAny = appt as any;
    if (apptAny.totalAmount !== undefined && apptAny.totalAmount !== null) {
      const price = typeof apptAny.totalAmount === 'number' ? apptAny.totalAmount : parseFloat(String(apptAny.totalAmount)) || 0;
      if (price > 0) return price;
    }
    if (apptAny.price !== undefined && apptAny.price !== null) {
      const price = typeof apptAny.price === 'number' ? apptAny.price : parseFloat(String(apptAny.price)) || 0;
      if (price > 0) return price;
    }
    if (appt.service?.price !== undefined && appt.service?.price !== null) {
      const price = typeof appt.service.price === 'number' ? appt.service.price : parseFloat(String(appt.service.price)) || 0;
      if (price > 0) return price;
    }
    
    return 0;
  }

  getServicePrice(appt: LocalAppointment): string {
    const price = this.getServicePriceNumber(appt);
    return price.toFixed(2).replace('.', ',');
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
