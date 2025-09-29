import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatButtonModule],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class AppointmentsComponent implements OnInit {
  appointments: any[] = [];
  error = '';
  displayedColumns: string[] = ['dateTime', 'status', 'actions'];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getAppointments().subscribe(
      data => this.appointments = data,
      error => this.error = 'Erro ao carregar agendamentos'
    );
  }

  cancel(id: number) {
    if (confirm('Tem certeza que deseja cancelar?')) {
      this.api.cancelAppointment(id).subscribe(
        () => this.ngOnInit(),
        error => this.error = 'Erro ao cancelar'
      );
    }
  }
}