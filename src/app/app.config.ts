// ARQUIVO: src/app/app.config.ts

import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
// 🛑 IMPORTANTE: Importar withInterceptors 🛑
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http'; 

import { routes } from './app.routes';

// 🛑 IMPORTAR SEU INTERCEPTOR 🛑
import { jwtInterceptor } from '../app/core/interceptors/jwt.interceptor'; 

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // 🔑 CORREÇÃO CRÍTICA: Adicionar withInterceptors AQUI 🔑
    provideHttpClient(
      //withFetch(),
      withInterceptors([jwtInterceptor]) // <-- SEU INTERCEPTOR ENTRA AQUI!
    ) 
  ]
};