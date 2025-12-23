import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

// --- IMPORTS ADICIONADOS PARA COMPILAÇÃO DO HTML (mat-icon e mat-spinner) ---
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
  // ADICIONADO MatProgressSpinnerModule
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
    this.isLoading = false; // <<< Adicione esta linha (Se ainda não estiver lá)
    this.resendForm.reset(); 
}

  closeResendEmailModal() {
    this.showResendEmailModal = false;
    this.resendForm.reset(); 
  }

  // MÉTODO CRÍTICO: REENVIO DE E-MAIL
resendEmail() {
    this.errorMessage = null; // Limpa erros anteriores

    // 🛑 VALIDAÇÃO MANUAL PRIMÁRIA (O BOTÃO AGORA ESTÁ SEMPRE VISÍVEL) 🛑
    if (this.resendForm.invalid) {
        // Exibe as mensagens de erro abaixo do campo (ex: "Email inválido")
        this.resendForm.markAllAsTouched(); 
        
        // Exibe uma mensagem de erro no topo do modal (se tiver espaço para isso)
        // Se preferir focar apenas nas mensagens de campo, remova o this.errorMessage
        this.errorMessage = 'Por favor, corrija o e-mail para prosseguir.'; 
        return;
    }
    
    // Inicia o processo de envio
    this.isLoading = true;
    const email = this.resendForm.get('emailToResend')?.value;

    // Embora o if (this.resendForm.invalid) já lide com o email nulo, mantemos este como segurança
    if (!email) {
      this.isLoading = false;
      return;
    }

    if (environment.isMockEnabled) {
      console.warn('MOCK HABILITADO: Simulação de reenvio de e-mail.');
      
      setTimeout(() => {
        // ✅ Sucesso no Mock: Abre o modal de simulação
        this.isLoading = false; // Reset necessário
        
        // Link de confirmação simulado
        const simulatedLink = `/confirm-email?email=${email}&code=MOCK_CODE`;
        
        this.mockEmailService.openMockEmailDialog(
          email, 
          simulatedLink,
          'confirm' // Passando o tipo correto para o MOCK
        ).subscribe(() => {
          this.closeResendEmailModal();
        });

      }, 1500);
      
    } else {
      // API REAL
      this.authService.resendConfirmationEmail(email).subscribe({
        next: () => {
          // ✅ Sucesso na API
          this.isLoading = false;
          this.closeResendEmailModal();
          // Adicione aqui um toast/notificação de sucesso (ex: "E-mail enviado!")
        },
        error: (err) => {
          // ❌ Falha na API
          this.isLoading = false;
          console.error('Erro ao solicitar reenvio (API Real):', err);
          this.errorMessage = 'Falha no reenvio. Verifique seu e-mail e tente novamente.';
        }
      });
    }
}
  
  onSubmit() {
    this.errorMessage = null;
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
             if (err.status === 401) {
                this.errorMessage = 'Credenciais inválidas. Verifique seu email e senha.';
             } else if (err.status === 403) {
                this.errorMessage = 'Sua conta não foi confirmada. Verifique seu email.';
             } else {
                this.errorMessage = `Erro do Servidor (${err.status}): Ocorreu um erro inesperado.`;
             }
          } else {
             this.errorMessage = 'Ocorreu um erro inesperado ao tentar logar.';
          }
        }
      });
    } else {
      this.isSubmitting = false;
    }
  }
}