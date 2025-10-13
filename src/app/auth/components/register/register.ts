// Localização: src/app/auth/components/register/register.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@auth/auth.service';
import { NotificationsService } from '@services/notifications.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { NgxMaskDirective } from 'ngx-mask';
import { RegisterRequestDto } from '@auth/models/register-request.model';
import { RegisterResponse } from '@auth/models/register-response.model';
import { ApiResponse } from '@models/common/api-response.model';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { FileUploadService } from '@services/file-upload.service';
import { environment } from '@environments/environment'; // Importe o ambiente

@Component({
  selector: 'app-register',
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  standalone: true,
  imports: [
    MatSnackBarModule,
    MatButtonModule,
    CommonModule,
    ReactiveFormsModule,
    NgxMaskDirective,
    RouterLink,
    MatIconModule
  ],
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  isLoading = false;
  errorMessage = "";
  hidePassword = true;
  hideConfirmPassword = true;
  notifications: any[] = [];
  profilePhotoPreview: string | ArrayBuffer | null = null;
  selectedFile: File | null = null;
  private readonly fotoPerfilMaxFileSize = 5242880;
  isRegistered = false;
  registrationSuccess = false;  
  isProduction = environment.production;  
  registeredUserEmail: string;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notificationsService: NotificationsService,
    private fileUploadService: FileUploadService
  ) { }

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      profilePhoto: [''],
      email: ['', [Validators.required, Validators.email]],
      nomeCompleto: ['', Validators.required],
      apelido: ['', Validators.required],
      cpf: ['', [Validators.required, CpfValidator]],
      celular: ['', [Validators.required, CelularValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      terms: [false, Validators.requiredTrue]
    }, { validators: this.passwordMatchValidator });
  }
onSubmit(): void {
    this.notifications = [];
    this.errorMessage = null;
    this.registrationSuccess = true;
    this.registeredUserEmail = this.registerForm.get('email').value;

    if (this.registerForm.invalid) {
      this.notificationsService.showNotification('Por favor, preencha o formulário corretamente.', 'Alerta');
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const registrationData: RegisterRequestDto = {
      email: this.registerForm.get('email')?.value,
      password: this.registerForm.get('password')?.value,
      confirmPassword: this.registerForm.get('confirmPassword')?.value,
      apelido: this.registerForm.get('apelido')?.value,
      nomeCompleto: this.registerForm.get('nomeCompleto')?.value,
      cpf: this.registerForm.get('cpf')?.value,
      celular: this.registerForm.get('celular')?.value,
      fotoPerfil: '',
      termsAccepted: this.registerForm.get('terms')?.value,
      host: window.location.host,
      scheme: window.location.protocol.slice(0, -1),
      sendConfirmationEmail: true
    };
    
    this.authService.register(registrationData).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe(
      (response: ApiResponse<RegisterResponse>) => {
        if (response.success) {
          const mensagem = response.message || 'Registro realizado com sucesso! Um e-mail de confirmação foi enviado.';
          this.notificationsService.showNotification(mensagem, 'sucesso');
          
          // <<-- AQUI ESTÁ A CORREÇÃO PRINCIPAL -->>
          // A navegação de teste ágil só ocorre em ambiente de desenvolvimento
          if (!this.isProduction) {
            const userId = response.data?.userId;
            const email = this.registeredUserEmail;
            this.router.navigate(['/testes/email'], { queryParams: { userId, email } });
          } else {
            // Se estiver em produção, segue o fluxo normal
            this.isRegistered = true;
            if (this.selectedFile && response.data?.userId) {
              this.uploadProfilePhoto(response.data.userId);
            }
          }
        } else {
          let errorMessage = 'Ocorreu um erro no registro. Por favor, tente novamente.';
          if (response.notifications && (response.notifications as any).$values?.length > 0) {
            errorMessage = (response.notifications as any).$values[0].mensagem;
          } else if (response.message) {
            errorMessage = response.message;
          }
          this.notificationsService.showNotification(errorMessage, 'erro');
        }
      },
      (errorResponse: HttpErrorResponse) => {
        let message = 'Erro de conexão. Verifique sua rede e tente novamente.';
        if (errorResponse.error) {
          if ((errorResponse.error as any).notifications?.$values?.length > 0) {
            message = (errorResponse.error as any).notifications.$values[0].mensagem;
          } else if ((errorResponse.error as any).message) {
            message = (errorResponse.error as any).message;
          }
        }
        this.notificationsService.showNotification(message, 'erro');
      },
      () => { }
    );
  }


  private uploadProfilePhoto(userId: string): void {
    if (!this.selectedFile) return;

    this.isLoading = true;
    this.fileUploadService.uploadFile(this.selectedFile).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (url: string) => {
        this.notificationsService.showNotification('Foto de perfil enviada com sucesso.', 'sucesso');
      },
      error: (error: any) => {
        console.error('Erro no upload do arquivo:', error);
        this.notificationsService.showNotification('Erro no upload da foto. Por favor, tente novamente.', 'erro');
      }
    });
  }

// Novo método para navegação
  navigateToMockEmail() {
    this.router.navigate(['/testes/email'], {
      queryParams: { email: this.registeredUserEmail }
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }
  
  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.profilePhotoPreview = e.target?.result;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  resendConfirmationEmail(): void {
    this.isLoading = true;
    const email = this.registerForm.get('email')?.value;
    const host = window.location.host;
    const scheme = window.location.protocol.slice(0, -1);

    if (email) {
      this.authService.resendConfirmationEmail(email).pipe(
        finalize(() => this.isLoading = false)
      ).subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationsService.showNotification('Novo e-mail de confirmação enviado. Verifique sua caixa de entrada.', 'sucesso');
          } else {
            this.notificationsService.showNotification(response.message || 'Erro ao reenviar e-mail de confirmação.', 'erro');
          }
        },
        error: () => {
          this.notificationsService.showNotification('Erro de rede ao tentar reenviar o e-mail.', 'erro');
        }
      });
    }
  }
}

export function CpfValidator(control: AbstractControl): { [key: string]: any } | null {
  const rawCpf = (control.value || '').replace(/\D/g, '');
  if (rawCpf.length !== 11) {
    return { 'invalidCpfLength': true };
  }
  return null;
}

export function CelularValidator(control: AbstractControl): { [key: string]: any } | null {
  const rawCelular = (control.value || '').replace(/\D/g, '');
  if (rawCelular.length !== 10 && rawCelular.length !== 11) {
    return { 'invalidCelularLength': true };
  }
  return null;
}