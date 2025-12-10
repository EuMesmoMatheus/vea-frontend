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
  @Input() active: boolean = false;

  // Filtros
  selectedPeriod: '7' | '30' | '90' | '365' = '30';
  
  private dataLoaded: boolean = false;
  
  // Data
  appointments: LocalAppointment[] = [];
  allServices: any[] = []; // Cache de serviços para carregar pelo ID
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
    console.log('📊 ReportsTabComponent ngOnInit - companyId:', this.companyId, 'active:', this.active);
    if (this.companyId && this.companyId > 0) {
      this.loadData();
    } else {
      console.warn('⚠️ ReportsTabComponent: companyId não está disponível ainda, tentando novamente em breve...');
      // Tentar novamente após um pequeno delay caso o companyId ainda não esteja disponível
      setTimeout(() => {
        if (this.companyId && this.companyId > 0 && !this.dataLoaded) {
          console.log('📊 ReportsTabComponent: Tentando carregar dados novamente após delay...');
          this.loadData();
        }
      }, 100);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('📊 ReportsTabComponent ngOnChanges - changes:', changes);
    if (changes['companyId']) {
      console.log('📊 ReportsTabComponent: companyId mudou de', changes['companyId'].previousValue, 'para', changes['companyId'].currentValue);
      if (this.companyId && this.companyId > 0) {
        this.dataLoaded = false;
        this.loadData();
      }
    }
    
    // Recarregar dados quando a aba for ativada pela primeira vez
    if (changes['active'] && this.active && !this.dataLoaded && this.companyId && this.companyId > 0) {
      console.log('📊 ReportsTabComponent: Aba ativada, carregando dados...');
      this.loadData();
    }
  }

  onPeriodChange(): void {
    this.loadData();
  }

  private loadData(): void {
    console.log('📊 ReportsTabComponent: loadData iniciado - companyId:', this.companyId, 'period:', this.selectedPeriod);
    
    if (!this.companyId || this.companyId === 0) {
      console.error('❌ ReportsTabComponent: companyId inválido, não é possível carregar dados');
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }
    
    this.loading = true;
    this.cdr.detectChanges();
    
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - parseInt(this.selectedPeriod));

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    console.log('📊 ReportsTabComponent: Buscando agendamentos de', startStr, 'até', endStr);

    // Carregar serviços primeiro (para usar quando necessário)
    if (this.allServices.length === 0) {
      this.api.getServices(this.companyId, true).subscribe({
        next: (res: any) => {
          if (res.success && res.data) {
            this.allServices = res.data;
            console.log('📦 Serviços carregados para cache (reports):', this.allServices.length);
          }
          this.loadAppointmentsData(startStr, endStr);
        },
        error: (err) => {
          console.error('❌ Erro ao carregar serviços:', err);
          this.allServices = [];
          this.loadAppointmentsData(startStr, endStr);
        }
      });
    } else {
      this.loadAppointmentsData(startStr, endStr);
    }
  }

  private loadAppointmentsData(startStr: string, endStr: string): void {
    console.log('📊 ReportsTabComponent: Chamando API getAppointmentsWeek com params:', { start: startStr, end: endStr, companyId: this.companyId });
    
    this.api.getAppointmentsWeek({ start: startStr, end: endStr, companyId: this.companyId }).subscribe({
      next: (res) => {
        console.log('📊 ReportsTabComponent: Resposta da API recebida:', res);
        if (res.success && res.data) {
          console.log('📊 ReportsTabComponent: Total de agendamentos recebidos:', res.data.length);
          // Normalizar agendamentos (mesma lógica do agenda-tab)
          this.appointments = res.data.map((a: any) => {
            const dateTime = new Date(a.startDateTime);
            
            // Helper para obter preço (já é número da API)
            const getPrice = (s: any): number => {
              if (s.price !== undefined && s.price !== null) return typeof s.price === 'number' ? s.price : parseFloat(String(s.price)) || 0;
              if (s.Price !== undefined && s.Price !== null) return typeof s.Price === 'number' ? s.Price : parseFloat(String(s.Price)) || 0;
              return 0;
            };
            
            // Normalizar serviços
            let normalizedServices: any[] | undefined = undefined;
            let normalizedService: any | undefined = undefined;
            
            if (a.services && Array.isArray(a.services) && a.services.length > 0) {
              normalizedServices = a.services.map((s: any) => ({
                id: s.id || s.Id || s.serviceId || s.ServiceId,
                name: s.name || s.Name || s.serviceName || s.ServiceName || 'Serviço',
                duration: s.duration || s.Duration || s.durationMinutes || 60,
                price: getPrice(s) // Price já é número
              }));
            }
            
            if (a.service && typeof a.service === 'object') {
              normalizedService = {
                id: a.service.id || a.service.Id || a.service.serviceId,
                name: a.service.name || a.service.Name || a.service.serviceName || 'Serviço',
                duration: a.service.duration || a.service.Duration || a.service.durationMinutes || 60,
                price: getPrice(a.service) // Price já é número
              };
            }
            
            // ServicesJson é uma string com IDs separados por vírgula (ex: "1,2,3")
            if (a.servicesJson && typeof a.servicesJson === 'string' && a.servicesJson.trim() && !normalizedServices) {
              try {
                // Tentar parsear como JSON primeiro (caso seja JSON)
                try {
                  const parsed = JSON.parse(a.servicesJson);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    normalizedServices = parsed.map((s: any) => ({
                      id: s.id || s.Id || s.serviceId || s.ServiceId,
                      name: s.name || s.Name || s.serviceName || s.ServiceName || 'Serviço',
                      duration: s.duration || s.Duration || s.durationMinutes || 60,
                      price: getPrice(s)
                    }));
                  } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    normalizedService = {
                      id: parsed.id || parsed.Id || parsed.serviceId,
                      name: parsed.name || parsed.Name || parsed.serviceName || 'Serviço',
                      duration: parsed.duration || parsed.Duration || parsed.durationMinutes || 60,
                      price: getPrice(parsed)
                    };
                  }
                } catch (jsonError) {
                  // Se não for JSON, tratar como string de IDs separados por vírgula
                  const serviceIds = a.servicesJson.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
                  if (serviceIds.length > 0) {
                    // Buscar serviços no cache pelo ID
                    const loadedServices = serviceIds.map((id: number) => {
                      const service = this.allServices.find(s => s.id === id);
                      if (service) {
                        return {
                          id: service.id,
                          name: service.name,
                          duration: service.duration,
                          price: typeof service.price === 'number' ? service.price : parseFloat(String(service.price)) || 0
                        };
                      }
                      return null;
                    }).filter((s: any) => s !== null);
                    
                    if (loadedServices.length > 0) {
                      normalizedServices = loadedServices;
                    }
                  }
                }
              } catch (e) {
                // Ignora erro de parsing
                console.error('❌ Erro ao processar servicesJson:', e, a.servicesJson);
              }
            }
            
            const normalized: any = {
              ...a,
              dateTime: dateTime
            };
            
            if (normalizedServices) {
              normalized.services = normalizedServices;
            } else if (a.services) {
              normalized.services = a.services;
            }
            
            if (normalizedService) {
              normalized.service = normalizedService;
            } else if (a.service) {
              normalized.service = a.service;
            }
            
            // Garantir que campos numéricos sejam números (já vem como número da API)
            if (a.totalPrice !== undefined && a.totalPrice !== null) {
              normalized.totalPrice = this.toNumber(a.totalPrice);
            }
            if (a.totalAmount !== undefined && a.totalAmount !== null) {
              normalized.totalAmount = this.toNumber(a.totalAmount);
            }
            if (a.price !== undefined && a.price !== null) {
              normalized.price = this.toNumber(a.price);
            }
            
            return normalized;
          }) as LocalAppointment[];
          
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
          this.dataLoaded = true;
          
          console.log('📊 ReportsTabComponent: KPIs calculados:', this.kpis);
          console.log('📊 ReportsTabComponent: Service Ranking:', this.serviceRanking.length, 'itens');
          console.log('📊 ReportsTabComponent: Employee Ranking:', this.employeeRanking.length, 'itens');
        } else {
          console.warn('⚠️ ReportsTabComponent: Resposta da API não tem sucesso ou dados vazios:', res);
          this.appointments = [];
          this.dataLoaded = true;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ ReportsTabComponent: Erro ao carregar agendamentos:', err);
        console.error('❌ Erro detalhado:', {
          status: err?.status,
          message: err?.message,
          error: err?.error
        });
        this.appointments = [];
        this.dataLoaded = true;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private calculateKPIs(): void {
    // Filtrar apenas agendamentos confirmados ou agendados (não cancelados)
    const confirmed = this.appointments.filter(a => 
      a.status === 'Confirmed' || a.status === 'Scheduled'
    );
    const cancelled = this.appointments.filter(a => a.status === 'Cancelled');
    
    // Calcular receita total somando os preços de todos os agendamentos confirmados
    const totalRevenue = confirmed.reduce((sum, a) => {
      const price = this.getPrice(a);
      return sum + price;
    }, 0);
    
    this.kpis = {
      totalAppointments: this.appointments.length,
      confirmedAppointments: confirmed.length,
      cancelledAppointments: cancelled.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100, // Arredonda para 2 casas decimais
      averageTicket: confirmed.length > 0 ? Math.round((totalRevenue / confirmed.length) * 100) / 100 : 0,
      cancellationRate: this.appointments.length > 0 
        ? Math.round((cancelled.length / this.appointments.length) * 100 * 10) / 10
        : 0
    };
  }

  private calculateServiceRanking(): void {
    const serviceMap: { [key: string]: { count: number; revenue: number } } = {};
    
    // Filtrar apenas agendamentos não cancelados
    this.appointments
      .filter(a => a.status !== 'Cancelled')
      .forEach(a => {
        const serviceName = this.getServiceName(a);
        const price = this.getPrice(a);
        
        if (!serviceMap[serviceName]) {
          serviceMap[serviceName] = { count: 0, revenue: 0 };
        }
        serviceMap[serviceName].count++;
        serviceMap[serviceName].revenue += price; // Soma o preço (já é número)
      });

    const total = Object.values(serviceMap).reduce((sum, s) => sum + s.count, 0);
    
    this.serviceRanking = Object.entries(serviceMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        revenue: Math.round(data.revenue * 100) / 100, // Arredonda para 2 casas decimais
        percentage: total > 0 ? Math.round((data.count / total) * 100 * 10) / 10 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue) // Ordena por receita (maior primeiro)
      .slice(0, 5);
  }

  private calculateEmployeeRanking(): void {
    const empMap: { [key: number]: { name: string; count: number; revenue: number } } = {};
    
    // Filtrar apenas agendamentos não cancelados com funcionário
    this.appointments
      .filter(a => a.status !== 'Cancelled' && a.employee)
      .forEach(a => {
        const empId = a.employee!.id;
        const empName = a.employee!.name;
        const price = this.getPrice(a);
        
        if (!empMap[empId]) {
          empMap[empId] = { name: empName, count: 0, revenue: 0 };
        }
        empMap[empId].count++;
        empMap[empId].revenue += price; // Soma o preço (já é número)
      });

    const total = Object.values(empMap).reduce((sum, e) => sum + e.count, 0);
    
    this.employeeRanking = Object.entries(empMap)
      .map(([id, data]) => ({
        id: parseInt(id),
        name: data.name,
        count: data.count,
        revenue: Math.round(data.revenue * 100) / 100, // Arredonda para 2 casas decimais
        percentage: total > 0 ? Math.round((data.count / total) * 100 * 10) / 10 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue) // Ordena por receita (maior primeiro)
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
      const servicesLength = appt.services.length;
      const names = appt.services.map((s: any) => s?.name || 'Serviço').filter((n: string) => n !== 'Serviço' || servicesLength === 1);
      if (names.length > 0) return names.join(', ');
    }
    if (appt.service?.name) {
      return appt.service.name;
    }
    // Se servicesJson existe mas services[] não foi carregado, tentar carregar pelo ID
    if (appt.servicesJson && typeof appt.servicesJson === 'string' && appt.servicesJson.trim()) {
      try {
        // Tentar parsear como JSON primeiro
        const parsed = JSON.parse(appt.servicesJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const names = parsed.map((s: any) => s?.name || s?.Name || 'Serviço').filter((n: string) => n !== 'Serviço' || parsed.length === 1);
          if (names.length > 0) return names.join(', ');
        } else if (parsed && typeof parsed === 'object' && parsed.name) {
          return parsed.name || parsed.Name || 'Serviço';
        }
      } catch (e) {
        // Se não for JSON, tratar como string de IDs separados por vírgula
        const serviceIds = appt.servicesJson.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
        if (serviceIds.length > 0 && this.allServices.length > 0) {
          const names = serviceIds.map((id: number) => {
            const service = this.allServices.find(s => s.id === id);
            return service?.name || 'Serviço';
          }).filter((n: string) => n !== 'Serviço' || serviceIds.length === 1);
          if (names.length > 0) return names.join(', ');
        }
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
      // Remove formatação brasileira se houver (R$ 50,00 -> 50.00)
      const cleaned = value.replace(/[R$\s]/g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private getPrice(appt: LocalAppointment): number {
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
    
    // Prioridade 2: Array de serviços (múltiplos serviços)
    // Price já vem como número da API, então usamos diretamente
    if (appt.services && Array.isArray(appt.services) && appt.services.length > 0) {
      const total = appt.services.reduce((sum: number, s: any) => {
        if (!s) return sum;
        const price = this.toNumber(s.price);
        return sum + price;
      }, 0);
      if (total > 0) return total;
    }
    
    // Prioridade 3: Serviço único
    // Price já vem como número da API
    if (appt.service?.price !== undefined && appt.service?.price !== null) {
      const price = this.toNumber(appt.service.price);
      if (price > 0) return price;
    }
    
    // Prioridade 4: Verificar servicesJson (se for string JSON ou IDs)
    if (appt.servicesJson) {
      try {
        // Tentar parsear como JSON primeiro
        const parsed = JSON.parse(appt.servicesJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const total = parsed.reduce((sum: number, s: any) => {
            if (!s) return sum;
            const price = this.toNumber(s.price || s.Price);
            return sum + price;
          }, 0);
          if (total > 0) return total;
        } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const price = this.toNumber(parsed.price || parsed.Price);
          if (price > 0) return price;
        }
      } catch (e) {
        // Se não for JSON, tratar como string de IDs separados por vírgula
        try {
          const serviceIds = appt.servicesJson.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
          if (serviceIds.length > 0 && this.allServices.length > 0) {
            const total = serviceIds.reduce((sum: number, id: number) => {
              const service = this.allServices.find(s => s.id === id);
              if (service) {
                const price = this.toNumber(service.price);
                return sum + price;
              }
              return sum;
            }, 0);
            if (total > 0) return total;
          }
        } catch (err) {
          // Ignora erro
        }
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
