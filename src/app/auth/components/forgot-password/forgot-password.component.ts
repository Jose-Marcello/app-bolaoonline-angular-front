// Localização: src/app/auth/components/forgot-password/forgot-password.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@auth/auth.service';
import { NotificationsService } from '@services/notifications.service'; 
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '@environments/environment';
import { ApiResponse, isPreservedCollection } from '@models/common/api-response.model';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm: FormGroup;
  isLoading = false;
  
  // ADICIONAR ESTAS DUAS VARIÁVEIS DE CONTROLE DE VISIBILIDADE
  hideNewPassword = true; 
  hideConfirmPassword = true;

  // APLICAÇÃO DA LÓGICA DE 3 AMBIENTES
  isMockEnvironment = 
    window.location.host.includes('localhost') || 
    window.location.host === 'app.palpitesbolao.com.br';
  isProduction = environment.production;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notificationsService: NotificationsService // <-- Injete o serviço
   
  ) {}

  ngOnInit(): void {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
   
  }

 // forgotten-password.component.ts

// forgotten-password.component.ts (Supondo que você adicionou a variável na classe)
/* Exemplo: 
  isMockEnvironment = window.location.host.includes('localhost') || window.location.host === 'app.palpitesbolao.com.br';
*/

// forgotten-password.component.ts

onSubmit(): void {
  if (this.forgotPasswordForm.invalid) {
    this.notificationsService.showNotification('Por favor, insira um e-mail válido.', 'alerta');
    return;
  }

  this.isLoading = true;
  const email = this.forgotPasswordForm.get('email')?.value;
  
  // ******************************************************************
  // LÓGICA DE CORREÇÃO: MOCK FORÇADO BASEADO APENAS NO AMBIENTE
  // ******************************************************************
  if (this.isMockEnvironment) {
    // Se estamos em MOCK (localhost ou staging), NUNCA FAZEMOS A CHAMADA À API.
    // Simulamos a resposta que o backend deveria dar (incluindo um link falso).
    
    // Simula um link de reset genérico para que o testador possa avançar
    const mockResetLink = `/reset-password?userId=MOCKUSERID&code=MOCKTOKEN&email=${email}`;
    
    this.notificationsService.showNotification('Simulação ATIVA: Redirecionando para a tela de teste de e-mail.', 'sucesso');
    
    this.router.navigate(['/testes/email'], { 
      queryParams: { link: mockResetLink, email: email, type: 'reset' } 
    });
    
    this.isLoading = false;
    return; // SAI DA FUNÇÃO, NÃO CHAMA O this.authService.forgotPassword
  }
  
  // ******************************************************************
  // FLUXO NORMAL (CHAMA A API E TRATA A RESPOSTA)
  // ******************************************************************
  this.authService.forgotPassword(email).subscribe({
    next: (response: ApiResponse<string>) => {
      this.isLoading = false;
      
      // Lógica de Segurança/Produção: Se sucesso, exibe mensagem clara.
      if (response.success) {
        // Exibe a mensagem de segurança do backend (que deve ser a do array)
        const notificationMessage = response.notifications?.$values[0].mensagem 
                                     || 'As instruções para redefinição foram enviadas. Verifique seu e-mail.';

        this.notificationsService.showNotification(notificationMessage, 'sucesso');
      } else {
        // ... (Se response.success for false - tratamento de array de notificação)
        const notifications = response.notifications;
        let notificationArray: any[] = [];
        
        if (notifications && isPreservedCollection(notifications)) {
            notificationArray = notifications.$values; 
        } else if (Array.isArray(notifications)) {
            notificationArray = notifications;
        }

        const errorMessage = notificationArray.map(n => n.mensagem).join(', ') || 'Erro ao enviar e-mail. Tente novamente.';
        this.notificationsService.showNotification(errorMessage, 'erro');
      }
    },
    error: (err: HttpErrorResponse) => {
      this.isLoading = false;
      // ... (Lógica de tratamento de erro HTTP) ...
      let errorMessage = 'Ocorreu um erro no servidor. Por favor, tente novamente mais tarde.';
      
      if (err.status === 404) {
        errorMessage = 'O serviço de recuperação de senha não está disponível. Por favor, tente mais tarde.';
      } else if (err.status >= 500) {
        errorMessage = 'Falha crítica do servidor. Tente novamente mais tarde.';
      }
      
      this.notificationsService.showNotification(errorMessage, 'erro');
      console.error('Erro na requisição de esqueceu senha:', err);
    }
  });
}

// reset-password.component.ts (Dentro da classe)

toggleNewPasswordVisibility(): void {
  this.hideNewPassword = !this.hideNewPassword;
}

toggleConfirmPasswordVisibility(): void {
  this.hideConfirmPassword = !this.hideConfirmPassword;
}

}