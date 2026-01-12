import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationsService } from '../../../../core/services/notifications.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';

import { RegisterRequestDto } from '../../../../features/auth/models/register-request.model';
import { RegisterResponse } from '../../../../features/auth/models/register-response.model';
import { ApiResponse } from '../../../../shared/models/api-response.model';
import { FileUploadService } from '../../../../core/services/file-upload.service';
import { MockEmailService } from '../../../../core/services/mock-email.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
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
  providers: [
    provideNgxMask()
  ]
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  
  hidePassword = true;
  hideConfirmPassword = true;
  
  notifications: any[] = [];
  profilePhotoPreview: string | ArrayBuffer | null | undefined = null;
  selectedFile: File | null = null;
  isRegistered = false;
  registrationSuccess = false;    
  registeredUserEmail: string = '';

  isMockEnvironment = environment.isMockEnabled;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notificationsService: NotificationsService,
    private fileUploadService: FileUploadService,
    private mockEmailService: MockEmailService
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

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }

  onSubmit(): void {
    this.notifications = [];
    this.errorMessage = null;
    this.registeredUserEmail = this.registerForm.get('email')?.value;

    if (this.registerForm.invalid) {
        this.notificationsService.showNotification('Por favor, preencha o formulário corretamente.', 'alerta');
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
    ).subscribe({
        next: (response: ApiResponse<RegisterResponse>) => {
            if (response.success) {
                console.log('--- REGISTRO BEM SUCEDIDO ---', response.data);
                const userId = response.data?.userId;
                const email = this.registeredUserEmail;

                if (this.isMockEnvironment && userId) { 
                    // 🚀 AUTO-CONFIRMAÇÃO PARA A DEMO
                    // Usamos um token fictício que seu backend deve aceitar no modo Mock
                    const tokenParaDemo = "token_automatico_demo";

                    this.authService.confirmEmail(userId, tokenParaDemo).subscribe({
                        next: () => console.log('DEMO: Usuário ativado no banco com sucesso.'),
                        error: (err) => console.warn('DEMO: Erro na ativação automática, verifique o backend.', err)
                    });

                    // Link visual para o Modal de E-mail Mock
                    const linkConfirmacao = `${window.location.protocol}//${window.location.host}/api/account/ConfirmEmail?userId=${userId}&code=${tokenParaDemo}`;

                    this.mockEmailService.openMockEmailDialog(email, linkConfirmacao, 'confirm').subscribe({
                        next: () => {
                            this.notificationsService.showNotification('E-mail enviado! Verifique a simulação para logar.', 'sucesso');
                            this.router.navigate(['/auth/login']);
                        }
                    });
                } else {
                    // Fluxo Real
                    this.registrationSuccess = true; 
                    this.isRegistered = true;
                    if (this.selectedFile && response.data?.userId) {
                        this.uploadProfilePhoto(response.data.userId);
                    }
                    this.notificationsService.showNotification('Cadastro realizado! Verifique seu e-mail.', 'sucesso');
                }
            } else {
                this.notificationsService.showNotification(response.message || 'Erro no registro.', 'erro');
            }
        },
        error: (error: HttpErrorResponse) => {
            this.notificationsService.showNotification('Erro de conexão com o servidor.', 'erro');
        }
    });
}

  private uploadProfilePhoto(userId: string): void {
    if (!this.selectedFile) return;
    this.fileUploadService.uploadFile(this.selectedFile).subscribe();
  }

  passwordMatchValidator(g: AbstractControl) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { 'mismatch': true };
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => this.profilePhotoPreview = e.target?.result;
      reader.readAsDataURL(this.selectedFile);
    }
  }
}

export function CpfValidator(control: AbstractControl) {
  const rawCpf = (control.value || '').replace(/\D/g, '');
  return rawCpf.length !== 11 ? { 'invalidCpfLength': true } : null;
}

export function CelularValidator(control: AbstractControl) {
  const rawCelular = (control.value || '').replace(/\D/g, '');
  return rawCelular.length !== 10 && rawCelular.length !== 11 ? { 'invalidCelularLength': true } : null;
}