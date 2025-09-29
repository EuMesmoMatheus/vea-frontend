import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { CardModule, TableModule, ButtonModule } from '@coreui/angular';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, CardModule, TableModule, ButtonModule],
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.scss']
})
export class EmployeesComponent implements OnInit {
  employees: any[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getEmployees().subscribe(data => this.employees = data);
  }

  delete(id: number) {
    this.api.deleteEmployee(id).subscribe(() => this.ngOnInit());
  }
}