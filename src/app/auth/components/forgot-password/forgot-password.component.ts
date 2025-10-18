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

onSubmit(): void {
  if (this.forgotPasswordForm.invalid) {
    this.notificationsService.showNotification('Por favor, insira um e-mail válido.', 'alerta');
    return;
  }

  this.isLoading = true;
  const email = this.forgotPasswordForm.get('email')?.value;
  
  this.authService.forgotPassword(email).subscribe({
    next: (response: ApiResponse<string>) => { // Assegure-se que o tipo é ApiResponse<string>
      this.isLoading = false;
      
      const resetLink = response.data; // O link/string do backend

      // **********************************************
      // 1. CHECAGEM PARA AMBIENTE DE SIMULAÇÃO (MOCK)
      // **********************************************
      // Se for sucesso E não for produção E o link de reset (Data) não for vazio/nulo
      if (response.success && !this.isProduction && resetLink) { 
        
        this.notificationsService.showNotification('Simulação ATIVA: Redirecionando para a tela de teste de e-mail.', 'sucesso');
        
        // REDIRECIONA O TESTADOR PARA O MOCK DE E-MAIL
        this.router.navigate(['/testes/email'], { 
          // Passamos o link de reset para que o testador possa usá-lo na próxima tela
          queryParams: { link: resetLink, email: email, type: 'reset' } 
        });
        return; // Sai da função após o mock
      } 
      
      // **********************************************
      // 2. CENÁRIO DE PRODUÇÃO / SEGURANÇA (Link nulo ou Produção)
      // **********************************************
      
      if (response.success) {
        // Usa a mensagem de segurança do backend (mesmo que o link tenha sido nulo no backend)
        this.notificationsService.showNotification(
          response.message || 'Se o e-mail estiver cadastrado, as instruções foram enviadas para redefinição.', 
          'sucesso'
        );
        // Opcional: Redirecionar para o login após sucesso de segurança
        // this.router.navigate(['/login']); 
      } else {
        // Erros de validação ou outros erros não-HTTP retornados pelo backend (Status 200, mas success: false)
        const errorMessage = response.notifications?.map(n => n.mensagem).join(', ') || 'Erro ao enviar e-mail. Tente novamente.';
        this.notificationsService.showNotification(errorMessage, 'erro');
      }
    },
    error: (err: HttpErrorResponse) => {
      this.isLoading = false;
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
}