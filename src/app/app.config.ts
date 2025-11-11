import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app-routing.module';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'; // Com interceptor support (opcional)

// Se criar o authInterceptor (veja abaixo), descomenta: import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()), // Ativa interceptors (pra token/companyId automático)
    // authInterceptor // Descomenta se criar o interceptor
  ]
};