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

onSubmit(): void {
  if (this.forgotPasswordForm.invalid) {
    this.notificationsService.showNotification('Por favor, insira um e-mail válido.', 'alerta');
    return;
  }

  this.isLoading = true;
  const email = this.forgotPasswordForm.get('email')?.value;
  
  this.authService.forgotPassword(email).subscribe({
    next: (response: ApiResponse<string>) => {
      this.isLoading = false;
      
      const resetLink = response.data;

      // **********************************************
      // 1. CHECAGEM PARA AMBIENTE DE SIMULAÇÃO (MOCK)
      // **********************************************
      // NOVO TESTE: Usamos isMockEnvironment para ativar o MOCK no Localhost e Staging
      if (response.success && this.isMockEnvironment && resetLink) { 
        
        this.notificationsService.showNotification('Simulação ATIVA: Redirecionando para a tela de teste de e-mail.', 'sucesso');
        
        // REDIRECIONA PARA O MOCK DE E-MAIL
        this.router.navigate(['/testes/email'], { 
          queryParams: { link: resetLink, email: email, type: 'reset' } 
        });
        return; // Sai da função
      } 
      
      // **********************************************
      // 2. CENÁRIO DE PRODUÇÃO / SEGURANÇA / ERRO DE VALIDAÇÃO
      // **********************************************
      
      if (response.success) {
        // Usa a mensagem de segurança do backend: "Se o e-mail estiver cadastrado, as instruções foram enviadas."
        this.notificationsService.showNotification(
          response.message || 'Se o e-mail estiver cadastrado, as instruções foram enviadas para redefinição.', 
          'sucesso'
        );
        // Opcional: Redirecionar para o login após sucesso de segurança
        // this.router.navigate(['/login']); 
      } else {
        // Erros de validação (Status 200, mas success: false)
        const notifications = response.notifications;
        let notificationArray: any[] = [];

        // LÓGICA DE CONVERSÃO DE ARRAY (MANTIDA)
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
      let errorMessage = 'Ocorreu um erro no servidor. Por favor, tente novamente mais tarde.';
      
      // Lógica de tratamento de erro HTTP (mantida)
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
}