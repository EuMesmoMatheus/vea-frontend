import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Service, Employee, AgendaEvent } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-agendamento-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agendamento-modal.component.html',
  styleUrls: ['./agendamento-modal.component.css']
})
export class AgendamentoModalComponent implements OnChanges {
  @Input() companyId!: number;
  @Input() clientId!: number;
  @Output() close = new EventEmitter<{ success: boolean }>();

  services: Service[] = [];
  employees: Employee[] = [];
  selectedServices: Service[] = [];
  selectedEmployee?: Employee;
  selectedDate: string = '';
  selectedTimeSlot: string = '';
  availableSlots: string[] = [];
  loadingSlots = false;
  loading = false;

  currentStep = 1;
  minDate = new Date().toISOString().split('T')[0];

  // URL DO BACKEND - usa environment
  private readonly apiBaseUrl = environment.apiUrl;
  
  // Horário de funcionamento da empresa (carregado da API)
  private companyOperatingHours: { start: string; end: string } = { start: '08:00', end: '18:00' };

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['companyId'] && this.companyId) {
      this.resetAll();
      this.loadCompanyInfo();
      this.loadServices();
      this.loadEmployees();
    }
  }

  /**
   * Carrega informações da empresa, incluindo horário de funcionamento
   */
  private loadCompanyInfo(): void {
    this.api.getCompany(this.companyId).subscribe({
      next: (response) => {
        if (response.success && response.data?.operatingHours) {
          const [start, end] = response.data.operatingHours.split('-');
          this.companyOperatingHours = {
            start: start?.trim() || '08:00',
            end: end?.trim() || '18:00'
          };
        }
      },
      error: () => {
        // Usa horário padrão se falhar
        this.companyOperatingHours = { start: '08:00', end: '18:00' };
      }
    });
  }

  private resetAll() {
    this.currentStep = 1;
    this.selectedServices = [];
    this.selectedEmployee = undefined;
    this.selectedDate = '';
    this.selectedTimeSlot = '';
    this.availableSlots = [];
    this.loadingSlots = false;
  }

  loadServices() {
    this.api.getServicesByCompany(this.companyId).subscribe(services => {
      this.services = services.filter(s => s.active);
    });
  }

  loadEmployees() {
    this.api.getEmployeesByService(this.companyId, 0).subscribe(employees => {
      console.log('👥 Funcionários recebidos:', employees.map(e => ({ name: e.name, emailVerified: e.emailVerified })));
      // Filtra apenas funcionários com email verificado
      this.employees = employees.filter(emp => emp.emailVerified === true);
      console.log('👥 Funcionários após filtro:', this.employees.length);
    });
  }

  nextStep() {
    if (this.currentStep === 1 && this.selectedServices.length === 0) return;
    if (this.currentStep === 2 && !this.selectedEmployee) return;
    if (this.currentStep === 3 && !this.selectedTimeSlot) return;

    if (this.currentStep === 3) this.loadAvailableSlots();
    if (this.currentStep < 4) this.currentStep++;
  }

  previousStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  isServiceSelected(s: Service): boolean {
    return this.selectedServices.some(x => x.id === s.id);
  }

  toggleService(service: Service) {
    if (this.isServiceSelected(service)) {
      this.selectedServices = this.selectedServices.filter(x => x.id !== service.id);
    } else {
      this.selectedServices.push(service);
    }
    this.resetSchedule();
  }

  selectEmployee(emp: Employee) {
    this.selectedEmployee = emp;
    this.resetSchedule();
  }

  // GETTERS
  get professionalFirstName(): string {
    return this.selectedEmployee?.name?.split(' ')[0] || 'o profissional';
  }

  get selectedServicesNames(): string {
    return this.selectedServices.map(s => s.name).join(', ');
  }

  // RESOLVE O PROBLEMA DA FOTO 100% — FUNCIONA COM URL COMPLETA OU RELATIVA
  getEmployeePhoto(employee: Employee): string {
    const photo = employee?.fullPhotoUrl;

    if (!photo) {
      return 'https://via.placeholder.com/120x120/cccccc/666666?text=Sem+Foto';
    }

    if (photo.startsWith('http')) {
      return photo;
    }

    const cleanPath = photo.startsWith('/') ? photo : `/${photo}`;
    return `${this.apiBaseUrl}${cleanPath}`;
  }

  resetSchedule() {
    this.selectedDate = '';
    this.selectedTimeSlot = '';
    this.availableSlots = [];
  }

  loadAvailableSlots() {
    if (!this.selectedDate || !this.selectedEmployee || this.selectedServices.length === 0) {
      this.availableSlots = [];
      return;
    }

    this.loadingSlots = true;
    const totalMinutes = this.totalDuration;
    const workHours = this.getWorkHours(this.selectedDate);
    const possibleSlots = this.generatePossibleSlots(workHours.start, workHours.end, 30);

    this.api.getAgendaDoDia(this.companyId, this.selectedEmployee.id, this.selectedDate)
      .subscribe({
        next: (events: AgendaEvent[]) => {
          const now = new Date();
          const isToday = this.selectedDate === now.toISOString().split('T')[0];
          
          this.availableSlots = possibleSlots.filter(slot => {
            const slotStart = new Date(`${this.selectedDate}T${slot}:00`);
            const slotEnd = new Date(slotStart.getTime() + totalMinutes * 60000);
            const dayEnd = new Date(`${this.selectedDate}T${workHours.end}:00`);
            
            // Se for hoje, não mostra horários que já passaram
            if (isToday && slotStart <= now) return false;
            
            if (slotEnd > dayEnd) return false;

            return !events.some(ev => {
              const evStart = new Date(ev.start);
              const evEnd = new Date(ev.end);
              return slotStart < evEnd && slotEnd > evStart;
            });
          });
          this.loadingSlots = false;
        },
        error: () => {
          this.availableSlots = [];
          this.loadingSlots = false;
        }
      });
  }

  selectTimeSlot(slot: string) {
    this.selectedTimeSlot = slot;
  }

  get totalDuration(): number {
    return this.selectedServices.reduce((sum, s) => sum + s.duration, 0);
  }

  get totalPrice(): number {
    // Price já vem como número da API
    return this.selectedServices.reduce((sum, s) => {
      const price = typeof s.price === 'number' ? s.price : parseFloat(String(s.price || 0)) || 0;
      return sum + price;
    }, 0);
  }

  // MÉTODO CORRIGIDO — ERA "canConfirmConfirm" (ERRO MEU!)
  confirm() {
    if (!this.canConfirm()) return;

    this.loading = true;
    const startDateTime = `${this.selectedDate}T${this.selectedTimeSlot}:00`;

    // Calcular preço total e duração total
    const totalPrice = this.totalPrice;
    const totalDuration = this.totalDuration;

    const payload = {
      companyId: this.companyId,
      serviceIds: this.selectedServices.map(s => s.id),
      employeeId: this.selectedEmployee!.id,
      clientId: this.clientId,
      startDateTime,
      totalPrice: totalPrice, // Adiciona o preço total
      totalDurationMinutes: totalDuration // Adiciona a duração total
    };

    console.log('📤 Payload do agendamento:', payload);
    console.log('💰 Preço total calculado:', totalPrice);
    console.log('⏱️ Duração total:', totalDuration);

    this.api.createAppointment(payload).subscribe({
      next: (res) => {
        if (res.success) {
          console.log('✅ Agendamento criado com sucesso:', res);
          this.toast.success('Agendamento confirmado com sucesso! ✅');
          this.close.emit({ success: true });
        } else {
          console.error('❌ Erro na resposta:', res);
          this.toast.error('Erro ao agendar. Tente novamente.');
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Erro ao criar agendamento:', err);
        this.toast.error('Erro ao agendar. Tente novamente. ❌');
        this.loading = false;
      }
    });
  }

  cancel() {
    this.close.emit({ success: false });
  }

  private canConfirm(): boolean {
    return this.selectedServices.length > 0 && !!this.selectedEmployee && !!this.selectedDate && !!this.selectedTimeSlot;
  }

  generatePossibleSlots(start: string, end: string, interval = 30): string[] {
    const slots: string[] = [];
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let current = new Date();
    current.setHours(sh, sm, 0, 0);
    const endTime = new Date();
    endTime.setHours(eh, em, 0, 0);

    while (current < endTime) {
      slots.push(current.toTimeString().slice(0, 5));
      current = new Date(current.getTime() + interval * 60000);
    }
    return slots;
  }

  /**
   * Retorna horário de funcionamento da empresa
   * Usa os dados carregados da API (operatingHours)
   */
  getWorkHours(_date: string): { start: string; end: string } {
    // Usa o horário de funcionamento da empresa carregado da API
    return this.companyOperatingHours;
  }
}