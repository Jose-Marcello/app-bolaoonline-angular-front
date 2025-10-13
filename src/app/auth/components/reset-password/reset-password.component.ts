// Localização: src/app/auth/components/reset-password/reset-password.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '@auth/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationsService } from '@services/notifications.service'; 

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  userId: string | null = null;
  code: string | null = null;
  isLoading = false;
  token: string | null = null;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationsService: NotificationsService // <-- Injete o serviço
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.userId = params.get('userId');
      this.code = params.get('code');
      if (!this.userId || !this.code) {
        this.notificationsService.showNotification('Token de redefinição de senha não encontrado. Por favor, tente novamente.', 'erro');
      }
    });

    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('newPassword')?.value === form.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  onSubmit(): void {
    if (this.resetPasswordForm.invalid || !this.token) {
      this.notificationsService.showNotification('Por favor, preencha o formulário corretamente.', 'alerta');
      return;
    }

    this.isLoading = true;
    const newPassword = this.resetPasswordForm.get('newPassword')?.value;

    this.authService.resetPassword(this.token, this.resetPasswordForm.value.newPassword)
  .subscribe({
    next: (response) => {
      // Se a redefinição de senha foi bem-sucedida
      if (response.success) {
        this.notificationsService.showNotification('Senha redefinida com sucesso!', 'sucesso');
        // Redirecionar para o login
        this.router.navigate(['/login']);
      } else {
        // Se a redefinição falhou
        this.notificationsService.showNotification(response.message || 'Falha ao redefinir senha.', 'erro');
      }
    },
    error: (err) => {
      // Se a chamada de API falhou
      this.notificationsService.showNotification('Erro ao se conectar com o servidor.', 'erro');
    }
  });
  }

  isSuccessMessage(): boolean {
    // Esta função se torna redundante e deve ser removida do HTML
    // A lógica de sucesso agora está no serviço
    return false;
  }
}