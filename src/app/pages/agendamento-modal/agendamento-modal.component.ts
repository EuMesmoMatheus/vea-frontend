import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Service, Employee, AgendaEvent } from '../../services/api.service';

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

  // URL DO BACKEND (AJUSTE SE FOR DIFERENTE)
  private readonly apiBaseUrl = 'http://localhost:63562';

  constructor(private api: ApiService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['companyId'] && this.companyId) {
      this.resetAll();
      this.loadServices();
      this.loadEmployees();
    }
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
      this.employees = employees;
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
          this.availableSlots = possibleSlots.filter(slot => {
            const slotStart = new Date(`${this.selectedDate}T${slot}:00`);
            const slotEnd = new Date(slotStart.getTime() + totalMinutes * 60000);
            const dayEnd = new Date(`${this.selectedDate}T${workHours.end}:00`);
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
    return this.selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
  }

  // MÉTODO CORRIGIDO — ERA "canConfirmConfirm" (ERRO MEU!)
  confirm() {
    if (!this.canConfirm()) return;

    this.loading = true;
    const startDateTime = `${this.selectedDate}T${this.selectedTimeSlot}:00`;

    const payload = {
      companyId: this.companyId,
      serviceIds: this.selectedServices.map(s => s.id),
      employeeId: this.selectedEmployee!.id,
      clientId: this.clientId,
      startDateTime
    };

    this.api.createAppointment(payload).subscribe({
      next: (res) => {
        if (res.success) {
          alert('Agendamento confirmado com sucesso!');
          this.close.emit({ success: true });
        } else {
          alert('Erro ao agendar.');
        }
        this.loading = false;
      },
      error: () => {
        alert('Erro ao agendar. Tente novamente.');
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

  getWorkHours(date: string): { start: string; end: string } {
    const day = new Date(date).getDay();
    return (day === 0 || day === 6) ? { start: '09:00', end: '14:00' } : { start: '08:00', end: '19:00' };
  }
}