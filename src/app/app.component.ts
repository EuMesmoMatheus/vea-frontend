import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastGlobalComponent } from './components/toast-global/toast-global.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastGlobalComponent],
  template: `
    <router-outlet></router-outlet>
    <app-toast-global></app-toast-global>
  `,
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'VEA - Veja, Explore e Agende';
}