import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Appointment } from '../../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css']
})
export class AccountComponent implements OnInit {
  user: any = {};
  appointments: Appointment[] = [];
  loading = true;
  error = '';

  activeTab: 'today' | 'future' | 'past' = 'today';
  filterDate: string = '';
  filteredAppointments: Appointment[] = [];

  todayAppointments: Appointment[] = [];
  futureAppointments: Appointment[] = [];
  pastAppointments: Appointment[] = [];

  // MODAL: ESSA LINHA É OBRIGATÓRIA!
  selectedAppointment: Appointment | null = null;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.loadUser();
    if (this.user.id) {
      this.loadAppointments();
    } else {
      this.loading = false;
    }
  }

  loadUser(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.user = JSON.parse(userData);
    } else {
      this.user = { name: 'Usuário', email: '' };
      this.error = 'Faça login para ver seus dados.';
    }
  }

  public loadAppointments(): void {
    this.loading = true;
    this.error = '';
    const companyId = this.user.companyId && this.user.companyId > 0 ? this.user.companyId : undefined;

    this.api.getMyAppointments(companyId).subscribe({
      next: (response) => {
        if (response.success) {
          this.appointments = response.data || [];
          this.categorizeAppointments();
        } else {
          this.error = response.message || 'Erro ao carregar agendamentos.';
        }
        this.loading = false;
      },
      error: () => {
        this.error = 'Falha na conexão.';
        this.loading = false;
      }
    });
  }

  private categorizeAppointments(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.todayAppointments = this.appointments.filter(a => {
      const d = new Date(a.startDateTime);
      return d >= today && d < tomorrow;
    });
    this.futureAppointments = this.appointments.filter(a => new Date(a.startDateTime) >= tomorrow);
    this.pastAppointments = this.appointments.filter(a => new Date(a.startDateTime) < today);

    this.applyFilter();
  }

  applyFilter(): void {
    let list: Appointment[] = [];
    if (this.activeTab === 'today') list = [...this.todayAppointments];
    else if (this.activeTab === 'future') list = [...this.futureAppointments];
    else list = [...this.pastAppointments];

    if (this.filterDate) {
      const f = new Date(this.filterDate);
      f.setHours(0, 0, 0, 0);
      const next = new Date(f);
      next.setDate(next.getDate() + 1);
      list = list.filter(a => {
        const d = new Date(a.startDateTime);
        return d >= f && d < next;
      });
    }
    this.filteredAppointments = list;
  }

  clearFilter(): void {
    this.filterDate = '';
    this.applyFilter();
  }

  reloadData(): void {
    this.loadUser();
    if (this.user.id) this.loadAppointments();
  }

  goBackToHub(): void { this.router.navigate(['/hub']); }
  goToLogin(): void { this.router.navigate(['/login']); }

  cancelAppointment(id: number): void {
    if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
      this.api.cancelAppointment(id).subscribe({
        next: () => {
          this.loadAppointments();
          this.selectedAppointment = null; // fecha o modal se estiver aberto
          alert('Cancelado com sucesso!');
        },
        error: () => alert('Erro ao cancelar.')
      });
    }
  }

  // ABRE O MODAL COM OS DETALHES
  viewDetails(appt: Appointment): void {
    this.selectedAppointment = appt;
  }

  trackByAppointmentId(_: number, appt: Appointment): number {
    return appt.id;
  }

  // VERIFICA SE JÁ PASSOU DO HORÁRIO
  isAlreadyDone(appt: Appointment): boolean {
    const now = new Date();
    const end = appt.endDateTime
      ? new Date(appt.endDateTime)
      : new Date(new Date(appt.startDateTime).getTime() + (appt.totalDurationMinutes || 60) * 60000);
    return end < now;
  }

  // LABEL DO STATUS
  getStatusLabel(appt: Appointment): string {
    if (this.isAlreadyDone(appt) && (appt.status === 'Scheduled' || appt.status === 'Confirmed')) {
      return 'Realizado';
    }
    const map: Record<string, string> = {
      'Scheduled': 'Agendado',
      'Confirmed': 'Confirmado',
      'Cancelled': 'Cancelado'
    };
    return map[appt.status] || appt.status;
  }

  // CLASSE DO STATUS
  getStatusClass(appt: Appointment): string {
    if (this.isAlreadyDone(appt) && (appt.status === 'Scheduled' || appt.status === 'Confirmed')) {
      return 'bg-slate-600 text-white';
    }
    const map: Record<string, string> = {
      'Scheduled': 'bg-yellow-100 text-yellow-800',
      'Confirmed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };
    return map[appt.status] || 'bg-gray-100 text-gray-800';
  }
}