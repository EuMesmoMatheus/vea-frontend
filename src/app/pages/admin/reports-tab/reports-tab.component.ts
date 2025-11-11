import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyPipe } from '@angular/common';

interface ServiceReport {
  name: string;
  count: number;
  totalPrice: number;
}

@Component({
  selector: 'app-reports-tab',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './reports-tab.component.html',
  styleUrls: ['./reports-tab.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsTabComponent {
  @Input() serviceReports: ServiceReport[] = [];
  @Input() lastUpdate = new Date();

  trackByName(index: number, item: ServiceReport): string { return item.name; }
}