// src/app/features/auth/auth.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component'; 
import { RegisterComponent } from './components/register/register.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
// Importação do MockEmailComponent (Ajuste o caminho se necessário)
import { MockEmailComponent } from '../../shared/components/mock-email/mock-email.component'; 


export const AUTH_ROUTES: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },

  // Esta rota é necessária para ser chamada pelo MockEmailService/Dialog
  { path: 'mock-email-view', component: MockEmailComponent },
  
  // Rota de MOCK (A exceção que o AuthGuard permite)
  { path: 'testes/email', component: MockEmailComponent },

];