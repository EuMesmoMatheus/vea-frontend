import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastGlobalComponent } from './components/toast-global/toast-global.component';
import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastGlobalComponent, ConfirmModalComponent],
  template: `
    <router-outlet></router-outlet>
    <app-toast-global></app-toast-global>
    <app-confirm-modal></app-confirm-modal>
  `,
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'VEA - Veja, Explore e Agende';
}