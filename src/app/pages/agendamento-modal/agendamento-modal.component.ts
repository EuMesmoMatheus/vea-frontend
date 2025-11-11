import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { ApiService, Service, Employee } from '../../services/api.service'; // Ajuste o path se necessário (ex: '../services/api.service')

interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
}

// <<< FIX: Alinhado com o backend/response (adiciona campos do payload/response real)
interface Appointment {
  id: number;
  companyId: number;
  serviceId: number;
  employeeId: number;
  clientId?: number;
  startDateTime: string;
  endDateTime?: string;
  status: string;
  dateTime?: Date;  // <<< Opcional: Pra compatibilidade com service antigo se precisar
  service?: Service;
  employee?: Employee;
}

@Component({
  selector: 'app-agendamento-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe], // <<< FIX: Adicionado CommonModule, ReactiveFormsModule e DatePipe
  templateUrl: './agendamento-modal.component.html',
  styleUrls: ['./agendamento-modal.component.css']
})
export class AgendamentoModalComponent implements OnInit {
  @Input() companyId!: number; // Recebe do hub
  @Input() clientId!: number;  // <<< FIX: Novo Input – recebe clientId diretamente do pai (hub.user.id)
  @Output() close = new EventEmitter<{ success: boolean; newAppointment?: Appointment }>(); // <<< MODIFICAÇÃO: Adicionado newAppointment opcional
  form!: FormGroup;
  currentStep = 0;
  loading = false;
  services: Service[] = [];
  employees: Employee[] = [];
  availableSlots: string[] = []; // <<< FIX: string[] simples, como backend retorna
  selectedService?: Service;
  selectedEmployeeName = ''; // <<< FIX: Nome do employee selecionado (pra mostrar no resumo)
  minDate = new Date().toISOString().split('T')[0]; // Data mínima: hoje

  constructor(private fb: FormBuilder, private api: ApiService) {
    this.form = this.fb.group({
      serviceId: ['', Validators.required],
      employeeId: ['', Validators.required],
      date: ['', Validators.required],
      timeSlot: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // <<< FIX: Validação inicial do clientId – se inválido, alerta e emite close (bloqueia agendamento)
    if (!this.clientId || this.clientId <= 0) {
      console.error('[Modal] ClientId inválido recebido:', this.clientId, '- Não é possível agendar sem login.');
      alert('Faça login como cliente para agendar serviços!');
      this.close.emit({ success: false });  // Fecha modal imediatamente
      return;
    }
    console.log('[Modal] ClientId recebido do pai:', this.clientId);  // <<< Debug: Confirma ID=1
    this.loadServices(); // Carrega serviços na abertura
  }

  // <<< FIX: Carrega serviços da empresa
  loadServices(): void {
    this.loading = true;
    this.api.getServicesByCompany(this.companyId).subscribe({
      next: (response: ApiResponse<Service[]>) => {
        if (response.success) {
          this.services = response.data || [];
          console.log('Serviços carregados:', this.services); // Debug
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro carregando serviços:', err);
        this.loading = false;
      }
    });
  }

  // Método novo: Validação específica por step (corrige o problema de form.valid global)
  isStepValid(step: number): boolean {
    switch (step) {
      case 0:
        return !!this.form.get('serviceId')?.value; // Só serviceId
      case 1:
        return !!this.form.get('serviceId')?.value && !!this.form.get('employeeId')?.value; // serviceId + employeeId
      case 2:
        return this.form.valid && this.availableSlots.length > 0; // Todos + slots disponíveis
      default:
        return false;
    }
  }

  onServiceChange(serviceId: string | number): void {
    const id = +serviceId;
    this.selectedService = this.services.find(s => s.id === id);
    this.form.patchValue({ employeeId: '', date: '', timeSlot: '' }); // Limpa próximos campos
    this.employees = []; // Limpa employees
    this.availableSlots = []; // Limpa slots
    if (this.selectedService) {
      this.loadEmployees(); // Recarrega employees por serviço
    }
  }

  // <<< FIX: Carrega employees por serviço
  loadEmployees(): void {
    if (!this.selectedService) return;
    this.loading = true;
    this.api.getEmployeesByService(this.companyId, this.selectedService.id).subscribe({
      next: (response: ApiResponse<Employee[]>) => {
        if (response.success) {
          this.employees = response.data || [];
          console.log('Employees carregados:', this.employees); // Debug
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro carregando employees:', err);
        this.loading = false;
      }
    });
  }

  // <<< FIX: Chama getAvailableSlots com params corretos (agora alinhados no service)
  onEmployeeOrDateChange(): void {
    const employeeId = this.form.get('employeeId')?.value;
    const date = this.form.get('date')?.value;
    if (!employeeId || !date || !this.selectedService) {
      this.availableSlots = []; // Limpa se inválido
      this.selectedEmployeeName = '';
      return;
    }
    this.loading = true;
    this.api.getAvailableSlots(this.companyId, +employeeId, date, this.selectedService.duration).subscribe({
      next: (response: ApiResponse<string[]>) => {
        if (response.success) {
          // <<< FIX: Mapeia direto como string[] (sem .time ou employeeName)
          this.availableSlots = response.data || [];
          console.log('Slots recebidos:', this.availableSlots); // Debug: Deve printar ["09:00", ...]
          // Atualiza nome do employee pro resumo
          const emp = this.employees.find(e => e.id === +employeeId);
          this.selectedEmployeeName = emp ? `${emp.name} - ${emp.roleName || 'Cargo não definido'}` : ''; // <<< FIX: Removido 'emp.cargo' (não existe na interface)
        } else {
          this.availableSlots = [];
          this.selectedEmployeeName = '';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro slots:', err); // <<< Adicione log pra debug
        this.availableSlots = [];
        this.selectedEmployeeName = '';
        this.loading = false;
      }
    });
  }

  // <<< AJUSTADO: Usa isStepValid em vez de form.valid global
  nextStep(): void {
    if (this.currentStep < 3 && this.isStepValid(this.currentStep)) {
      this.currentStep++;
    } else if (this.currentStep === 2) {
      alert('Selecione uma data com horários disponíveis.'); // UX melhor
    }
  }

  prevStep(): void {
    if (this.currentStep > 0) this.currentStep--;
  }

  confirm(): void {
    if (!this.form.valid || !this.selectedService) return;

    // <<< FIX: Constrói StartDateTime combinando date + timeSlot
    const date = this.form.value.date;
    const time = this.form.value.timeSlot;
    if (!date || !time) {
      alert('Data e horário obrigatórios.');
      return;
    }
    const startDateTime = new Date(`${date}T${time}:00`).toISOString(); // Ex: "2025-10-31T16:30:00.000Z" – <<< Ajuste timezone se backend esperar local

    // <<< FIX: Usa o Input clientId diretamente (já validado no ngOnInit)
    if (this.clientId <= 0) {
      alert('Erro: ClientId inválido. Faça login novamente.');
      this.cancel();
      return;
    }

    const payload = {
      companyId: this.companyId,
      serviceId: +this.selectedService.id, // <<< Garantia de number
      employeeId: +this.form.value.employeeId, // <<< Garantia de number
      clientId: this.clientId,  // <<< FIX: Sempre usa o ID válido passado do pai
      startDateTime: startDateTime // <<< FIX: Campo obrigatório
      // Removido: duration e price (backend ignora)
    };

    console.log('Payload enviado (com clientId válido):', payload); // <<< Debug: Verifique no console

    this.loading = true;
    this.api.createAppointment(payload).subscribe({
      next: (response) => {  // <<< FIX: Removido typing explícito no next pra evitar conflito de interfaces; TS infere do Observable
        if (response.success) {
          console.log('Agendamento criado com sucesso!', response.data);
          // <<< MODIFICAÇÃO: Emite o novo appt pro pai (casting se necessário, mas agora alinhado)
          this.close.emit({
            success: true,
            newAppointment: response.data as Appointment  // <<< FIX: Casting seguro pro tipo local se o response não matchar 100%
          });
        } else {
          alert('Erro ao agendar: ' + (response.message || 'Tente novamente'));
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro confirm:', err); // <<< Log full pra debug
        alert('Falha no agendamento: ' + (err.message || 'Tente novamente'));
        this.loading = false;
      }
    });
  }

  cancel(): void {
    this.close.emit({ success: false });
  }
}