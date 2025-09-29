import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule, RowModule, ColModule } from '@coreui/angular';

@Component({
  selector: 'app-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, RowModule, ColModule],
  templateUrl: './hub.component.html',
  styleUrls: ['./hub.component.scss']
})
export class HubComponent implements OnInit {
  companies: any[] = [];
  filterLocation = '';
  error = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getCompanies().subscribe(
      data => this.companies = data,
      error => this.error = 'Erro ao carregar empresas'
    );
  }

  filter() {
    this.companies = this.companies.filter(c => c.location.includes(this.filterLocation));
  }
}