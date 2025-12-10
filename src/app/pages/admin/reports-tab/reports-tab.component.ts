import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Appointment } from '../../../services/api.service';

interface LocalAppointment extends Appointment {
  dateTime: Date;
}

interface KPIs {
  totalAppointments: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  totalRevenue: number;
  averageTicket: number;
  cancellationRate: number;
}

interface ServiceRanking {
  name: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface EmployeeRanking {
  id: number;
  name: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface DayStats {
  day: string;
  dayShort: string;
  count: number;
  percentage: number;
}

@Component({
  selector: 'app-reports-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports-tab.component.html',
  styleUrls: ['./reports-tab.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsTabComponent implements OnInit, OnChanges {
  @Input() companyId!: number;

  // Filtros
  selectedPeriod: '7' | '30' | '90' | '365' = '30';
  
  // Data
  appointments: LocalAppointment[] = [];
  kpis: KPIs = {
    totalAppointments: 0,
    confirmedAppointments: 0,
    cancelledAppointments: 0,
    totalRevenue: 0,
    averageTicket: 0,
    cancellationRate: 0
  };
  serviceRanking: ServiceRanking[] = [];
  employeeRanking: EmployeeRanking[] = [];
  dayStats: DayStats[] = [];
  
  // UI
  loading = false;
  lastUpdate = new Date();

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.companyId) {
      this.loadData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['companyId'] && this.companyId) {
      this.loadData();
    }
  }

  onPeriodChange(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - parseInt(this.selectedPeriod));

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    this.api.getAppointmentsWeek({ start: startStr, end: endStr, companyId: this.companyId }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.appointments = res.data.map((a: Appointment) => ({
            ...a,
            dateTime: new Date(a.startDateTime)
          })) as LocalAppointment[];
          
          // Debug: verificar estrutura dos agendamentos
          if (this.appointments.length > 0) {
            console.log('📦 Primeiro agendamento (estrutura):', {
              id: this.appointments[0].id,
              services: this.appointments[0].services,
              service: this.appointments[0].service,
              totalPrice: (this.appointments[0] as any).totalPrice,
              priceCalculated: this.getPrice(this.appointments[0])
            });
            
            // Verificar se há serviços com preço
            if (this.appointments[0].services && this.appointments[0].services.length > 0) {
              console.log('📋 Serviços do primeiro agendamento:', this.appointments[0].services.map((s: any) => ({
                name: s.name,
                price: s.price,
                priceType: typeof s.price
              })));
            }
          }
          
          this.calculateKPIs();
          this.calculateServiceRanking();
          this.calculateEmployeeRanking();
          this.calculateDayStats();
          this.lastUpdate = new Date();
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Erro ao carregar agendamentos:', err);
        this.appointments = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private calculateKPIs(): void {
    const confirmed = this.appointments.filter(a => a.status === 'Confirmed' || a.status === 'Scheduled');
    const cancelled = this.appointments.filter(a => a.status === 'Cancelled');
    
    const totalRevenue = confirmed.reduce((sum, a) => sum + this.getPrice(a), 0);
    
    this.kpis = {
      totalAppointments: this.appointments.length,
      confirmedAppointments: confirmed.length,
      cancelledAppointments: cancelled.length,
      totalRevenue,
      averageTicket: confirmed.length > 0 ? totalRevenue / confirmed.length : 0,
      cancellationRate: this.appointments.length > 0 
        ? (cancelled.length / this.appointments.length) * 100 
        : 0
    };
  }

  private calculateServiceRanking(): void {
    const serviceMap: { [key: string]: { count: number; revenue: number } } = {};
    
    this.appointments
      .filter(a => a.status !== 'Cancelled')
      .forEach(a => {
        const serviceName = this.getServiceName(a);
        if (!serviceMap[serviceName]) {
          serviceMap[serviceName] = { count: 0, revenue: 0 };
        }
        serviceMap[serviceName].count++;
        serviceMap[serviceName].revenue += this.getPrice(a);
      });

    const total = Object.values(serviceMap).reduce((sum, s) => sum + s.count, 0);
    
    this.serviceRanking = Object.entries(serviceMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        revenue: data.revenue,
        percentage: total > 0 ? (data.count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private calculateEmployeeRanking(): void {
    const empMap: { [key: number]: { name: string; count: number; revenue: number } } = {};
    
    this.appointments
      .filter(a => a.status !== 'Cancelled' && a.employee)
      .forEach(a => {
        const empId = a.employee!.id;
        const empName = a.employee!.name;
        if (!empMap[empId]) {
          empMap[empId] = { name: empName, count: 0, revenue: 0 };
        }
        empMap[empId].count++;
        empMap[empId].revenue += this.getPrice(a);
      });

    const total = Object.values(empMap).reduce((sum, e) => sum + e.count, 0);
    
    this.employeeRanking = Object.entries(empMap)
      .map(([id, data]) => ({
        id: parseInt(id),
        name: data.name,
        count: data.count,
        revenue: data.revenue,
        percentage: total > 0 ? (data.count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private calculateDayStats(): void {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const daysShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dayCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
    
    this.appointments
      .filter(a => a.status !== 'Cancelled')
      .forEach(a => {
        const dayIndex = a.dateTime.getDay();
        dayCounts[dayIndex]++;
      });

    const maxCount = Math.max(...dayCounts, 1);
    
    this.dayStats = days.map((day, index) => ({
      day,
      dayShort: daysShort[index],
      count: dayCounts[index],
      percentage: (dayCounts[index] / maxCount) * 100
    }));
  }

  // Helpers
  private getServiceName(appt: LocalAppointment): string {
    if (appt.services && Array.isArray(appt.services) && appt.services.length > 0) {
      return appt.services.map((s: any) => s.name).join(', ');
    }
    if (appt.service?.name) {
      return appt.service.name;
    }
    return 'Serviço';
  }

  private getPrice(appt: LocalAppointment): number {
    // Helper para converter preço para número
    const parsePrice = (price: any): number => {
      if (price === null || price === undefined) return 0;
      if (typeof price === 'number') return isNaN(price) ? 0 : price;
      if (typeof price === 'string') {
        // Remove formatação brasileira (R$ 50,00 -> 50.00)
        const cleaned = price.replace(/[R$\s]/g, '').replace(',', '.');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };
    
    const apptAny = appt as any;
    
    // Prioridade 1: Verificar campos diretos do agendamento
    if (apptAny.totalPrice !== undefined && apptAny.totalPrice !== null) {
      const price = parsePrice(apptAny.totalPrice);
      if (price > 0) return price;
    }
    if (apptAny.totalAmount !== undefined && apptAny.totalAmount !== null) {
      const price = parsePrice(apptAny.totalAmount);
      if (price > 0) return price;
    }
    if (apptAny.price !== undefined && apptAny.price !== null) {
      const price = parsePrice(apptAny.price);
      if (price > 0) return price;
    }
    
    // Prioridade 2: Array de serviços (múltiplos serviços)
    if (appt.services && Array.isArray(appt.services) && appt.services.length > 0) {
      const total = appt.services.reduce((sum: number, s: any) => {
        if (!s) return sum;
        const price = parsePrice(s.price);
        return sum + price;
      }, 0);
      if (total > 0) return total;
    }
    
    // Prioridade 3: Serviço único
    if (appt.service?.price !== undefined && appt.service?.price !== null) {
      const price = parsePrice(appt.service.price);
      if (price > 0) return price;
    }
    
    // Prioridade 4: Verificar servicesJson (se for string JSON)
    if (appt.servicesJson) {
      try {
        const parsed = JSON.parse(appt.servicesJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const total = parsed.reduce((sum: number, s: any) => {
            if (!s) return sum;
            const price = parsePrice(s.price);
            return sum + price;
          }, 0);
          if (total > 0) return total;
        }
      } catch (e) {
        // Ignora erro de parse
      }
    }
    
    return 0;
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getAvatarColor(index: number): string {
    const colors = ['bg-pink-500', 'bg-purple-500', 'bg-indigo-500', 'bg-blue-500', 'bg-teal-500'];
    return colors[index % colors.length];
  }

  getPeriodLabel(): string {
    switch (this.selectedPeriod) {
      case '7': return 'últimos 7 dias';
      case '30': return 'últimos 30 dias';
      case '90': return 'últimos 90 dias';
      case '365': return 'último ano';
      default: return '';
    }
  }
}
