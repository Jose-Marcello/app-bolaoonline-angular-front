import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// <<-- NOVAS IMPORTAÇÕES E REGISTRO DE LOCALIDADE AQUI -->>
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt'; // Importa os dados da localidade 'pt'

// Registra os dados da localidade 'pt' globalmente
registerLocaleData(localePt, 'pt');


bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
