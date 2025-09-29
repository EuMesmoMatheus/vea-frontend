import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatTableModule],
  templateUrl: './hub.component.html',
  styleUrls: ['./hub.component.scss']
})
export class HubComponent implements OnInit {
  companies: any[] = [];
  filterLocation = '';
  error = '';
  displayedColumns: string[] = ['name', 'location', 'phone', 'actions'];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getCompanies().subscribe(
      data => this.companies = data,
      error => this.error = 'Erro ao carregar empresas'
    );
  }

  filter() {
    this.companies = this.companies.filter(c => c.location.toLowerCase().includes(this.filterLocation.toLowerCase()));
  }
}