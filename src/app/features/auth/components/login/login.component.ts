import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

// --- IMPORTS DO MATERIAL ---
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
  notifications: any[] = []; // Adicionado para corrigir o erro de compilação
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
    this.isLoading = false;
    this.notifications = [];
    this.resendForm.reset(); 
  }

  closeResendEmailModal() {
    this.showResendEmailModal = false;
    this.resendForm.reset(); 
  }

  resendEmail() {
    this.notifications = [];
    if (this.resendForm.invalid) {
        this.resendForm.markAllAsTouched(); 
        return;
    }
    
    this.isLoading = true;
    const email = this.resendForm.get('emailToResend')?.value;

    if (environment.isMockEnabled) {
      setTimeout(() => {
        this.isLoading = false;
        
        // --- ADICIONE ESTA LINHA AQUI PARA FECHAR O MODAL ESCURO ---
        this.closeResendEmailModal(); 
        
        const simulatedLink = `/confirm-email?email=${email}&code=MOCK_CODE`;
        
        // Agora o Mock abre sozinho na tela limpa
        this.mockEmailService.openMockEmailDialog(email!, simulatedLink, 'confirm').subscribe();
      }, 1500);
    } else {
      // Lógica da API real...
    }
}
  onSubmit() {
    this.notifications = []; // Limpa erros anteriores no início do submit
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
  next: (res: any) => {
    // Verificamos se o loginSucesso é falso, mesmo com Status 200
    if (res.data && res.data.loginSucesso === false) {
      this.isSubmitting = false;
      this.notifications = [];
      
      // Pegamos a mensagem de "Sua conta ainda não foi confirmada"
      const msg = res.notifications?.[0]?.mensagem || 'Falha no login.';
      this.notifications.push({ tipo: 'Erro', mensagem: msg });
      
    } else {
      // Sucesso real: redireciona
      this.isSubmitting = false;
      this.router.navigate(['/dashboard']);
    }
  },
  error: (err: any) => {
    // Este bloco só é executado para erros 400, 401, 500, etc.
    this.isSubmitting = false;
    this.notifications = [{ tipo: 'Erro', mensagem: 'Erro de conexão com o servidor.' }];
  }
});
    }
  }
}

/*
else {
      this.isSubmitting = false;
    }*/
