import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { CardModule, TableModule, ButtonModule } from '@coreui/angular';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, CardModule, TableModule, ButtonModule],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesComponent implements OnInit {
  services: any[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getServices().subscribe(data => this.services = data);
  }

  delete(id: number) {
    this.api.deleteService(id).subscribe(() => this.ngOnInit());
  }
}