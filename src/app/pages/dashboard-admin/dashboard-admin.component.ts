import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule, RowModule, ColModule } from '@coreui/angular';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, CardModule, RowModule, ColModule],
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.scss']
})
export class DashboardAdminComponent implements OnInit {
  employeesCount = 0;
  servicesCount = 0;
  appointmentsCount = 0;

  constructor() {}

  ngOnInit() {
    // Chame APIs para métricas reais
    this.employeesCount = 5; // Simulado
    this.servicesCount = 3;
    this.appointmentsCount = 10;
  }
}