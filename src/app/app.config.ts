// src/app/app.config.ts
import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),

    // ESSAS DUAS LINHAS MATAM O ERRO DO DATEPIPE PARA SEMPRE
    { provide: LOCALE_ID, useValue: 'pt-BR' }
    // Se quiser forçar o fuso horário também (recomendado no Brasil):
    // { provide: LOCALE_ID, useValue: 'pt-BR' },
    // { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' }
  ]
};