// ARQUIVO: src/app/features/auth/components/forgot-password/forgot-password.component.ts

import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router'; 
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../services/auth.service';
import { ApiResponse } from '../../../../shared/models/api-response.model'
import { environment } from '../../../../../environments/environment'; 
import { MockEmailService } from '../../../../core/services/mock-email.service'; 

// --- LOG DE VERSÃO FINAL ---
const VERSION_LOG = '1.0.1-SWA-Fix-Final-V5-Token-Real'; 
// --------------------------------------------------

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule], 
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  
  private fb = inject(FormBuilder);
  private authService = inject<AuthService>(AuthService); 
  private router = inject(Router); 
  private mockEmailService = inject(MockEmailService); 

  forgotPasswordForm: FormGroup;
  isLoading: boolean = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor() {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    console.log(`[APP VERSION] ForgotPasswordComponent - Versão do Código: ${VERSION_LOG}`);
  }

  onSubmit(): void {
    this.successMessage = null;
    this.errorMessage = null;

    if (this.forgotPasswordForm.invalid) {
      this.errorMessage = 'Por favor, insira um e-mail válido.';
      return; 
    }
    
    this.isLoading = true;
    const email = this.forgotPasswordForm.value.email as string;

    // Ação: SEMPRE chamamos a API REAL para que o Token seja gerado no Backend, 
    // mesmo que o MOCK esteja ativo.
    this.authService.forgotPassword(email).subscribe({
      next: (response: ApiResponse<string>) => {
        
        // A API Real deve retornar o link completo com o token REAL no 'response.data'
        const resetLink = response.data; 

        // 1. Mensagem de Sucesso padrão para o usuário
        this.successMessage = 'Se o e-mail estiver cadastrado, você receberá um link de redefinição de senha em breve.';
        this.isLoading = false;
        
        // 2. ATIVAÇÃO DO MOCK VISUAL: Usa o link REAL (resetLink) para exibir o modal.
        // O link DEVE ser um valor diferente de null e conter '/reset-password'.
        if (environment.isMockEnabled && resetLink && resetLink.includes('/reset-password')) {
            console.log('MOCK ATIVO: Token REAL gerado. Abrindo modal para simular o clique.');
            
            // CHAMA O SERVIÇO DE DIÁLOGO, USANDO O LINK REAL (resetLink)!
            this.mockEmailService.openMockEmailDialog(
                email, 
                resetLink,
                'confirm'
            ).subscribe();
        } 
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        
        // Mantemos a mensagem de sucesso por segurança
        this.successMessage = 'Se o e-mail estiver cadastrado, você receberá um link de redefinição de senha em breve.';
        
        console.error('Erro no ForgotPassword API (Detalhes):', err);
      }
    });
  }
}