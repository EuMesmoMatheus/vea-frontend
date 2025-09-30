import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app-routing.module'; // Importa o array routes
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes), // Usa o array routes diretamente
    provideAnimations(),
    provideHttpClient()
  ]
};