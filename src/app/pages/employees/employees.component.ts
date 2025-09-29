import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatButtonModule],
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.scss']
})
export class EmployeesComponent implements OnInit {
  employees: any[] = [];
  error = '';
  displayedColumns: string[] = ['name', 'email', 'role', 'actions'];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getEmployees().subscribe(
      data => this.employees = data,
      error => this.error = 'Erro ao carregar funcionários'
    );
  }

  delete(id: number) {
    if (confirm('Tem certeza que deseja excluir?')) {
      this.api.deleteEmployee(id).subscribe(
        () => this.ngOnInit(),
        error => this.error = 'Erro ao excluir (pode ter agendamentos pendentes)'
      );
    }
  }
}