import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { ApiService, Appointment } from '../../services/api.service';
import { Router } from '@angular/router'; // <<< NOVO: Import Router para navegação

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css']
})
export class AccountComponent implements OnInit {
  user: any = {};
  appointments: Appointment[] = [];
  loading = true;
  error = '';

  constructor(private api: ApiService, private router: Router) {} // <<< NOVO: Inject Router

  ngOnInit(): void {
    this.loadUser();
    if (this.user.id) {
      this.loadAppointments();
    } else {
      console.warn('User sem ID – redirecione pra login se necessário');
      this.loading = false;
    }
  }

  // <<< FIX: Tornou público (removeu 'private') pra acessar do HTML
  loadUser(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.user = JSON.parse(userData);
      console.log('User carregado na conta:', this.user);  // Debug
    } else {
      this.user = { name: 'Usuário', email: '' };
      this.error = 'Faça login para ver suas informações.';
    }
  }

  // <<< UPDATE: Não passa companyId se for 0 (deixa backend filtrar só por clientId)
  public loadAppointments(): void {
    this.loading = true;
    this.error = '';
    // <<< Só passa companyId se >0 (ex: cliente com empresa fixa); senão, undefined = filtra só por clientId
    const companyId = this.user.companyId && this.user.companyId > 0 ? this.user.companyId : undefined;
    this.api.getMyAppointments(companyId).subscribe({
      next: (response) => {
        if (response.success) {
          this.appointments = response.data || [];
          console.log('Meus agendamentos carregados:', this.appointments.length);
        } else {
          this.error = response.message || 'Erro ao carregar agendamentos.';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro load appointments:', err);
        this.error = 'Falha ao carregar agendamentos. Tente novamente.';
        this.loading = false;
      }
    });
  }

  // <<< NOVO: Método público pra recarregar tudo (chama loadUser e loadAppointments)
  reloadData(): void {
    this.loadUser();
    if (this.user.id) {
      this.loadAppointments();
    }
  }

  // <<< NOVO: Navegação para Hub
  goBackToHub(): void {
    this.router.navigate(['/hub']); // <<< Ajuste a rota se necessário (ex: '/home' ou '/dashboard')
  }

  // <<< NOVO: Navegação para Login
  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  // <<< NOVO: Cancelar agendamento (chama API e recarrega lista)
  cancelAppointment(id: number): void {
    if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
      this.api.cancelAppointment(id).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadAppointments(); // Recarrega a lista
            alert('Agendamento cancelado com sucesso!');
          }
        },
        error: (err) => {
          console.error('Erro ao cancelar:', err);
          alert('Falha ao cancelar agendamento. Tente novamente.');
        }
      });
    }
  }

  // <<< NOVO: Ver detalhes (ex: navega para página de detalhes ou modal - placeholder)
  viewDetails(id: number): void {
    // Placeholder: Navega para rota de detalhes ou abre modal
    console.log('Ver detalhes do agendamento:', id);
    // Exemplo: this.router.navigate(['/appointment', id]);
    alert(`Detalhes do agendamento ${id} (implemente modal ou rota aqui)`);
  }

  // <<< FIX: TrackBy method public correto (sem ng-template)
  trackByAppointmentId(index: number, appt: Appointment): number {
    return appt.id;
  }

  // Helper: Status traduzido
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'Scheduled': 'Agendado',
      'Confirmed': 'Confirmado',
      'Cancelled': 'Cancelado'
    };
    return labels[status] || status;
  }

  // Helper: Badge cor por status
  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'Scheduled': 'bg-yellow-100 text-yellow-800',
      'Confirmed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }
}