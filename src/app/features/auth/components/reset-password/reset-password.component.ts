import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
// Removidos todos os imports do Angular Material (MatCard, MatInput, MatSpinner, etc.)
import { NotificationsService } from '../../../../core/services/notifications.service';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { ApiResponse } from '../../../../shared/models/api-response.model';

// --- LOG DE VERSÃO ---
const VERSION_LOG = '1.0.1-ResetPassword-Final-Debug'; 
// ----------------------

@Component({
  selector: 'app-reset-password',
  standalone: true,
  // Mantendo apenas o essencial para um componente de rota simples
  imports: [
    CommonModule, 
    ReactiveFormsModule,  
    RouterModule 
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  // Injeções
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notificationsService = inject(NotificationsService);
  
  resetPasswordForm!: FormGroup;
  
  // Parâmetros de Token da URL
  userId: string | null = null;
  userEmail: string | null = null;
  code: string | null = null; 
// 🟢 CORREÇÃO: Variável isTokenValid, inicialmente falsa
  isTokenValid: boolean = false;
  isLoading = false;
  
  // Variável de DEBUG na UI (CRÍTICA)
  debugErrorDetails: string | null = null; 
  
  // Variáveis de Toggle de Senha (Visibilidade)
  hideNewPassword = true; 
  hideConfirmPassword = true;

  constructor() {}

  ngOnInit(): void { 
    // Log de Versão
    console.log(`[APP VERSION] ResetPasswordComponent - Versão do Código: ${VERSION_LOG}`);
    
    // 1. Captura dos Parâmetros da URL
    this.route.queryParamMap.subscribe(params => {
      this.userId = params.get('userId');
      this.code = params.get('code'); 
      
      this.userEmail = this.authService.getStoredUserEmail();
      
      // Validação
      if (!this.userId || !this.code) { 
        this.notificationsService.showNotification('Token de redefinição de senha não encontrado. Por favor, tente novamente.', 'erro');
        this.resetPasswordForm?.disable();
      }
      
      console.log(`[DEBUG] UserId: ${this.userId}`);
      console.log(`[DEBUG] Code (URL-Safe): ${this.code}`);
      
    });

    // 2. Inicialização do Formulário
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    }, { 
      validators: this.passwordMatchValidator 
    });
    
    // Desabilitar se os parâmetros críticos estiverem faltando
    if (!this.userId || !this.code) {
      this.resetPasswordForm.disable();
    }
  }

  // Validador Customizado para Coincidência de Senhas
  passwordMatchValidator(g: AbstractControl) {
    const newPassword = g.get('newPassword')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;

    return newPassword && confirmPassword && newPassword === confirmPassword 
      ? null : { 'mismatch': true }; 
  }
  
  // Lógica de Toggle de Senha
  toggleNewPasswordVisibility(): void {
    this.hideNewPassword = !this.hideNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }

  // Método de Submissão do Formulário
  onSubmit(): void {
    this.debugErrorDetails = null; // Limpa o erro anterior

    if (this.resetPasswordForm.invalid || !this.code || !this.userId) { 
      this.notificationsService.showNotification('Por favor, preencha o formulário corretamente e garanta que o link de redefinição esteja completo.', 'alerta');
      return;
    }

    this.isLoading = true;
    
    const newPassword = this.resetPasswordForm.get('newPassword')?.value;

     // ✅ CORREÇÃO: Removido o this.userEmail que não é necessário para o DTO
     this.authService.resetPassword(this.userId, this.code, newPassword) 
     .pipe(finalize(() => this.isLoading = false))
     .subscribe({
      next: (response: ApiResponse<any>) => {
        if (response.success) {
          this.notificationsService.showNotification('Senha redefinida com sucesso! Você já pode fazer login.', 'sucesso');
          this.router.navigate(['/login']);
        } else {
          // Falha na redefinição (token inválido, senha fraca, etc.)
          const backendMessage = response.message || 
                                 response.notifications?.[0]?.mensagem || 
                                 'Falha ao redefinir senha. O link pode estar expirado.';
          this.notificationsService.showNotification(backendMessage, 'erro');
          this.debugErrorDetails = `API Response: ${backendMessage}`; // Exibe o erro na UI de debug
        }
      },
      error: (err: HttpErrorResponse) => {
        // Falha HTTP (400, 500)
        console.error('Erro HTTP na redefinição de senha:', err);
        
        // Extrai a mensagem de erro detalhada do Backend
        const detailedMessage = err.error?.message || 
                                (err.error?.notifications && err.error.notifications[0]?.mensagem) ||
                                (err.error?.errors && Object.values(err.error.errors)[0]?.[0]) || 
                                `Erro HTTP ${err.status}: Ocorreu um erro no servidor. Verifique o console.`;
        
        this.notificationsService.showNotification(detailedMessage, 'erro');
        this.debugErrorDetails = `Erro no Backend: ${detailedMessage}`; // Exibe o erro na UI de debug
      }
    });
  }

  isSuccessMessage(): boolean {
    return false;
  }
}