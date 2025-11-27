// src/main.ts

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// ESSENCIAL: registro do locale pt-BR (resolve o erro do DatePipe de uma vez por todas)
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

registerLocaleData(localePt);

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));