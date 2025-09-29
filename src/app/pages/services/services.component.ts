import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatButtonModule],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesComponent implements OnInit {
  services: any[] = [];
  error = '';
  displayedColumns: string[] = ['name', 'description', 'duration', 'price', 'actions'];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getServices().subscribe(
      data => this.services = data,
      error => this.error = 'Erro ao carregar serviços'
    );
  }

  delete(id: number) {
    if (confirm('Tem certeza que deseja excluir?')) {
      this.api.deleteService(id).subscribe(
        () => this.ngOnInit(),
        error => this.error = 'Erro ao excluir (pode ter agendamentos pendentes)'
      );
    }
  }
}