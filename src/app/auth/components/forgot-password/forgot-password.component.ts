// Localização: src/app/auth/components/forgot-password/forgot-password.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@auth/auth.service';
import { NotificationsService } from '@services/notifications.service'; 
import { HttpErrorResponse } from '@angular/common/http';

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

  onSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      this.notificationsService.showNotification('Por favor, insira um e-mail válido.', 'alerta');
      return;
    }

    this.isLoading = true;
    const email = this.forgotPasswordForm.get('email')?.value;
    
    this.authService.forgotPassword(email).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.notificationsService.showNotification('Seu e-mail foi enviado. Por favor, verifique sua caixa de entrada para instruções de redefinição de senha.', 'sucesso');
        } else {
          const errorMessage = response.notifications?.map(n => n.mensagem).join(', ') || 'Erro ao enviar e-mail. Tente novamente.';
          this.notificationsService.showNotification(errorMessage, 'erro');
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        let errorMessage = 'Ocorreu um erro no servidor. Por favor, tente novamente mais tarde.';
        if (err.status === 404) {
          errorMessage = 'O serviço de recuperação de senha não está disponível. Por favor, tente mais tarde.';
        }
        this.notificationsService.showNotification(errorMessage, 'erro');
        console.error('Erro na requisição de esqueceu senha:', err);
      }
    });
  }
}