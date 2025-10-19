// Localização: src/app/auth/components/reset-password/reset-password.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '@auth/auth.service';
// Importação dos Módulos do Material (para o template)
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationsService } from '@services/notifications.service'; 
import { HttpErrorResponse } from '@angular/common/http'; // Para tratamento de erro
import { finalize } from 'rxjs/operators'; // Para o loading state

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    RouterModule, 
    MatCardModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatButtonModule, 
    MatProgressSpinnerModule
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm!: FormGroup;
  
  // Parâmetros de Token da URL
  userId: string | null = null;
  code: string | null = null;
  token: string | null = null; // Usado para a checagem no submit

  isLoading = false;
  
  // Variáveis de Toggle de Senha (Visibilidade)
  hideNewPassword = true; 
  hideConfirmPassword = true;

  // Variável que armazena a URL da página atual
  resetLink: string = ''; 

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationsService: NotificationsService
  ) {}

  ngOnInit(): void { 
    // 1. Captura dos Parâmetros da URL e atribuição ao token
    this.route.queryParamMap.subscribe(params => {
      this.userId = params.get('userId');
      this.code = params.get('code');
      this.token = this.code; // Atribui o código ao token
      
      // Captura o link completo da página (usado para debugging/referência)
      this.resetLink = window.location.href; 

      if (!this.userId || !this.code) {
        this.notificationsService.showNotification('Token de redefinição de senha não encontrado. Por favor, tente novamente.', 'erro');
        // Desabilita o formulário se o token for inválido
        this.resetPasswordForm.disable(); 
      }
    });

    // 2. Inicialização do Formulário com o validador de coincidência
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    }, { 
      // Aplica o validador que checa se os dois campos são iguais no FormGroup
      validators: this.passwordMatchValidator 
    });
  }

  // Lógica de Toggle de Senha
  toggleNewPasswordVisibility(): void {
    this.hideNewPassword = !this.hideNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }

  // Validador Customizado para Coincidência de Senhas
  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true }; 
  }

  // Método de Submissão do Formulário
  onSubmit(): void {
    // 1. Validação crítica (garante que os dados do token existem)
    if (this.resetPasswordForm.invalid || !this.token || !this.userId) {
      this.notificationsService.showNotification('Por favor, preencha o formulário corretamente e garanta que o link de redefinição esteja completo.', 'alerta');
      return;
    }

    this.isLoading = true;
    
    // Extrai os valores
    const newPassword = this.resetPasswordForm.get('newPassword')?.value;
    const confirmPassword = this.resetPasswordForm.get('confirmPassword')?.value;

    // A chamada envia os 4 parâmetros exigidos pelo backend
    this.authService.resetPassword(this.userId, this.token, newPassword, confirmPassword)
    .pipe(finalize(() => this.isLoading = false))
    .subscribe({
      next: (response) => {
        // Se a redefinição de senha foi bem-sucedida
        if (response.success) {
          this.notificationsService.showNotification('Senha redefinida com sucesso! Você já pode fazer login.', 'sucesso');
          this.router.navigate(['/login']);
        } else {
          // Se a redefinição falhou (erro de validação do backend, token inválido)
          this.notificationsService.showNotification(response.message || 'Falha ao redefinir senha. O link pode estar expirado.', 'erro');
        }
      },
      error: (err: HttpErrorResponse) => {
        // Se a chamada de API falhou (500, erro de conexão)
        this.notificationsService.showNotification('Erro ao se conectar com o servidor.', 'erro');
        console.error('Erro HTTP na redefinição de senha:', err);
      }
    });
  }

  // Esta função é redundante no template atual e pode ser removida do HTML
  isSuccessMessage(): boolean {
    return false;
  }
}