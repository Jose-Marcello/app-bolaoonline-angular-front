import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

// --- IMPORTS DO MATERIAL ---
import { MatIconModule } from '@angular/material/icon'; 
import { MatButtonModule } from '@angular/material/button'; 
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; 

// --- IMPORTS DE SERVIÇOS ---
import { AuthService } from '../../services/auth.service';
import { MockEmailService } from '../../../../core/services/mock-email.service';
import { LoginRequestDto } from '../../models/login-request.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    RouterLink, 
    MatIconModule, 
    MatButtonModule, 
    MatProgressSpinnerModule 
  ], 
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'] 
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private mockEmailService = inject(MockEmailService);

  // --- VARIÁVEIS DE ESTADO ---
  notifications: any[] = []; // Adicionado para corrigir o erro de compilação
  errorMessage: string | null = null;
  isSubmitting = false; 
  isLoading = false; 
  hidePassword = true; 
  showResendEmailModal = false; 

  // --- FORMULÁRIOS ---
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  resendForm: FormGroup = this.fb.group({
    emailToResend: ['', [Validators.required, Validators.email]]
  });

  // --- MÉTODOS DE AÇÃO ---
  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  openResendEmailModal(): void {
    this.showResendEmailModal = true;
    this.isLoading = false;
    this.notifications = [];
    this.resendForm.reset(); 
  }

  closeResendEmailModal() {
    this.showResendEmailModal = false;
    this.resendForm.reset(); 
  }

  resendEmail() {
    this.notifications = [];
    if (this.resendForm.invalid) {
        this.resendForm.markAllAsTouched(); 
        this.notifications.push({ tipo: 'Erro', mensagem: 'Por favor, corrija o e-mail para prosseguir.' });
        return;
    }
    
    this.isLoading = true;
    const email = this.resendForm.get('emailToResend')?.value;

    if (environment.isMockEnabled) {
      setTimeout(() => {
        this.isLoading = false;
        const simulatedLink = `/confirm-email?email=${email}&code=MOCK_CODE`;
        this.mockEmailService.openMockEmailDialog(email!, simulatedLink, 'confirm').subscribe(() => {
          this.closeResendEmailModal();
        });
      }, 1500);
    } else {
      this.authService.resendConfirmationEmail(email!).subscribe({
        next: () => {
          this.isLoading = false;
          this.closeResendEmailModal();
        },
        error: (err) => {
          this.isLoading = false;
          this.notifications.push({ tipo: 'Erro', mensagem: 'Falha no reenvio. Verifique seu e-mail.' });
        }
      });
    }
  }
  
  onSubmit() {
    this.notifications = []; // Limpa erros anteriores no início do submit
    this.isSubmitting = true; 

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.isSubmitting = false;
      return;
    }

    const { email, password } = this.loginForm.value;

    if (email && password) {
      const loginRequestDto: LoginRequestDto = {
        email: email!,      
        password: password!,
        isPersistent: true 
      };

      this.authService.login(loginRequestDto).subscribe({ 
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/dashboard']);
        },

        error: (err: any) => {
          this.isSubmitting = false;
          
          if (err instanceof HttpErrorResponse) {
              // Captura a mensagem vinda do Notificador do C#
              const apiMessage = err.error?.notifications?.[0]?.mensagem;

              if (err.status === 400 || err.status === 401) {
                 this.notifications.push({ 
                    tipo: 'Erro', 
                    mensagem: apiMessage || 'Credenciais inválidas. Verifique seu email e senha.' 
                 });
              } else if (err.status === 403) {
                 this.notifications.push({ 
                    tipo: 'Erro', 
                    mensagem: 'Sua conta não foi confirmada. Verifique seu email.' 
                 });
              } else {
                 this.notifications.push({ 
                    tipo: 'Erro', 
                    mensagem: `Erro (${err.status}): Tente novamente em instantes.` 
                 });
              }
          } else {
              this.notifications.push({ tipo: 'Erro', mensagem: 'Ocorreu um erro inesperado ao tentar logar.' });
          }
        }
      });
    } else {
      this.isSubmitting = false;
    }
  }
}