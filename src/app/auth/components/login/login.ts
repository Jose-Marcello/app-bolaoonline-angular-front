import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';

import { AuthService } from '@auth/auth.service';
import { NotificationsService } from '@services/notifications.service';
import { LoginRequestDto } from '@auth/models/login-request.model';
import { LoginResponse } from '@auth/models/login-response.model';
import { ApiResponse, isPreservedCollection } from '@models/common/api-response.model';
import { environment } from '@environments/environment'; // Importe o ambiente

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    RouterLink,
    MatIconModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  resendForm!: FormGroup; // <-- Declaração da propriedade
  isLoading: boolean = false;
  private authSubscription: Subscription | null = null;
  hidePassword = true; 
  
  showResendEmailModal = false;
  isProduction = environment.production; // Adicione esta linha
  
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notificationsService: NotificationsService,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
    
    // AQUI ONDE DECLARAMOS E INICIALIZAMOS O FORMGROUP DO MODAL
    this.resendForm = this.fb.group({
      emailToResend: ['', [Validators.required, Validators.email]]
    });
    
    this.authSubscription = this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated && !this.isAuthRoute()) {
        this.router.navigate(['/dashboard']);
      }
    });

    this.route.queryParams.subscribe(params => {
      if (params['status'] && params['message']) {
        const status = params['status'];
        const message = params['message'];
        this.notificationsService.showNotification(message, status === 'success' ? 'sucesso' : 'erro');
      }
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.notificationsService.showNotification('Por favor, preencha o e-mail e a senha corretamente.', 'alerta');
      this.loginForm.markAllAsTouched();
      return;
    }
    
    this.isLoading = true;
    const loginRequest: LoginRequestDto = this.loginForm.value;

    this.authService.login(loginRequest).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (response: ApiResponse<LoginResponse>) => {
        const loginResponseData = isPreservedCollection<LoginResponse>(response.data) ? response.data.$values[0] : response.data;
        if (response.success && loginResponseData?.loginSucesso) {
          this.authService.setSession(loginResponseData);
          this.notificationsService.showNotification('Login realizado com sucesso!', 'sucesso');
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 50);
        } else {
          const errorMessage = response.message || 'Credenciais inválidas. Tente novamente.';
          this.notificationsService.showNotification(errorMessage, 'erro');
        }
      },
      error: (err: HttpErrorResponse) => {
        let errorMessage = 'Ocorreu um erro desconhecido. Por favor, tente novamente mais tarde.';
        this.notificationsService.showNotification(errorMessage, 'erro');
      }
    });
  }

  openResendEmailModal(): void {
    this.showResendEmailModal = true;
  }

  closeResendEmailModal(): void {
    this.showResendEmailModal = false;
    this.resendForm.reset();
  }

  resendEmail(): void {
    if (this.resendForm.valid) {
      this.isLoading = true;
      const email = this.resendForm.get('emailToResend')?.value;

      this.authService.resendConfirmationEmail(email).subscribe({
        next: (response) => {
          // Se não estiver em produção, redireciona para a tela de mock
          if (!this.isProduction) {
            this.router.navigate(['/testes/email'], {
              queryParams: { email: email }
            });
            this.notificationsService.showNotification('Redirecionando para a tela de testes...', 'sucesso');
          } else {
            // Em produção, exibe a notificação normal
            this.notificationsService.showNotification(response.message || 'Seu pedido de reenvio foi processado.', 'sucesso');
          }
          this.closeResendEmailModal();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erro ao reenviar e-mail:', err);
          this.notificationsService.showNotification('Falha ao reenviar e-mail. Tente novamente mais tarde.', 'erro');
          this.isLoading = false;
        }
      });
    } else {
      this.notificationsService.showNotification('Por favor, digite um e-mail válido.', 'alerta');
      this.resendForm.get('emailToResend')?.markAsTouched();
    }
  }

  isAuthRoute(): boolean {
    const currentUrl = this.router.url;
    return currentUrl.includes('/login') ||
           currentUrl.includes('/register') ||
           currentUrl.includes('/forgot-password') ||
           currentUrl.includes('/reset-password') ||
           currentUrl.includes('/confirm-email') ||
           currentUrl.includes('/resposta-confirmacao');
  }
}