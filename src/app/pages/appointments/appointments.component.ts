import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { CardModule, TableModule, ButtonModule } from '@coreui/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'; // Para c-table

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, CardModule, TableModule, ButtonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class AppointmentsComponent implements OnInit {
  appointments: any[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getAppointments().subscribe(data => this.appointments = data);
  }

  cancel(id: number) {
    this.api.cancelAppointment(id).subscribe(() => this.ngOnInit());
  }
}