import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

// --- IMPORTS DO MATERIAL ---
import { MatIconModule } from '@angular/material/icon'; 
import { MatButtonModule } from '@angular/material/button'; 
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; 
import { finalize } from 'rxjs/operators';

// --- IMPORTS DE SERVIÇOS ---
import { AuthService } from '../../services/auth.service';
import { MockEmailService } from '../../../../core/services/mock-email.service';
import { LoginRequestDto } from '../../models/login-request.model';

@Component({
  selector: 'app-login',
  standalone: true, // Certifique-se de que esta linha existe
  imports: [
    CommonModule,
    ReactiveFormsModule, // ESSENCIAL para o [formGroup] e resendForm funcionar
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})

export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  resendForm: FormGroup; // Formulário para o Modal de Reenvio
  

  isSubmitting = false;
  isLoading = false; // Para o botão de reenvio
  hidePassword = true;
  notifications: any[] = [];
  showResendEmailModal = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private mockEmailService: MockEmailService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });

    this.resendForm = this.fb.group({
      emailToResend: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {}

  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.notifications = [];

    this.authService.login(this.loginForm.value).pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: (res: any) => {
        // TRATAMENTO DO FALSO POSITIVO (HTTP 200 mas loginSucesso: false)
        if (res.success && res.data?.loginSucesso === false) {
          const apiMessage = res.notifications?.[0]?.mensagem || 'Conta pendente de confirmação.';
          this.notifications.push({ tipo: 'Erro', mensagem: apiMessage });
        } 
        else if (res.success && res.data?.loginSucesso === true) {
          // Sucesso real - Navega para o sistema
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err: any) => {
        const msg = err.error?.notifications?.[0]?.mensagem || 'Erro ao realizar login.';
        this.notifications.push({ tipo: 'Erro', mensagem: msg });
      }
    });
  }

  // MÉTODOS DO MODAL DE REENVIO
  openResendEmailModal() {
    this.showResendEmailModal = true;
    this.notifications = [];
  }

  closeResendEmailModal() {
    this.showResendEmailModal = false;
    this.resendForm.reset();
  }

  resendEmail() {
    if (this.resendForm.invalid) {
      this.resendForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const email = this.resendForm.get('emailToResend')?.value;

    // Se o Mock estiver ativo no environment.ts
    if (environment.isMockEnabled) {
      setTimeout(() => {
        this.isLoading = false;
        this.closeResendEmailModal(); // FECHA O MODAL ANTES DE ABRIR O MOCK

        // O link de confirmação deve apontar para o seu componente de teste
        // Passando userId (se tiver) ou apenas o email para o Mock
        const simulatedLink = `/confirm-email?email=${email}&code=MOCK_TOKEN_RESEND`;
        
        this.mockEmailService.openMockEmailDialog(email, simulatedLink, 'confirm').subscribe();
      }, 1500);
    } else {
      // Chamada real para o seu Backend C#
      this.authService.resendConfirmationEmail(email).subscribe({
        next: () => {
          this.isLoading = false;
          this.closeResendEmailModal();
          this.notifications.push({ tipo: 'Sucesso', mensagem: 'E-mail de confirmação enviado!' });
        },
        error: () => {
          this.isLoading = false;
          this.notifications.push({ tipo: 'Erro', mensagem: 'Erro ao reenviar e-mail.' });
        }
      });
    }
  }
}