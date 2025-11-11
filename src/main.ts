import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig} from './app/app.config'; // FIX: Path direto pra app.config.ts na root de src/app

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));