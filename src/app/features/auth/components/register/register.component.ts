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

               // 🔍 O RAIO-X: Isso vai mostrar exatamente a estrutura do seu JSON no console
               console.log('--- ESTRUTURA COMPLETA DO RESPONSE.DATA ---', response.data);

                if (this.isMockEnvironment) { 
                    const userId = response.data?.userId;
              
                    // PEGUE O CÓDIGO LONGO QUE APARECEU NO SEU LOG DO SERVIDOR (CONSOLE DO C#)
                    // E COLE AQUI ENTRE ASPAS.  ** PROVISÓRIO ** 
                    const tokenFake = "CfDJ8MpoZ3KcRFJElHyc9%2BQtwO8whrar3ysYG07RyJ%2BzI3bR6TePHTt6vqHID9XhmB1uJjy6RvRsnBEC6RgBZjBAnFf%2BTIBqaL0uZH7bASYFTFv1IimZSzVJ9CFNOHbWeMoW0Jadi7rMHX%2F%2BIzHFINtOPRQq5J4T8cxDSYRo%2FG2buIoRYkMw5T7ZenLHl6TnpM5Pv7vkZQV%2F4QOHExtKmmIvqMe1wMeVatDHEBCCIOxKPQyD%2F%2FLyQ3x2KhBHte4I1w6L4w%3D%3D";

                    const email = this.registeredUserEmail;

                    const token = (response.data as any)?.code || 
                                  (response.data as any)?.emailToken || 
                                  (response.data as any)?.token;

                    const linkConfirmacao = `https://localhost:5001/api/account/ConfirmEmail?userId=${userId}&code=${tokenFake}`;

                    console.log('Ambiente MOCK - Link Gerado:', linkConfirmacao);

                    this.mockEmailService.openMockEmailDialog(email, linkConfirmacao, 'confirm').subscribe({
                        next: () => {
                            this.notificationsService.showNotification('E-mail enviado! Verifique a simulação para logar.', 'sucesso');
                            this.router.navigate(['/auth/login']);
                        }
                    });
                } else {
                    this.registrationSuccess = true; 
                    this.isRegistered = true;
                    if (this.selectedFile && response.data?.userId) {
                        this.uploadProfilePhoto(response.data.userId);
                    }
                }
            } else {
                this.notificationsService.showNotification(response.message || 'Erro no registro.', 'erro');
            }
        },
        error: (error: HttpErrorResponse) => {
            this.notificationsService.showNotification('Erro de conexão com o servidor.', 'erro');
        }
    });
  } // ✅ Chave de fechamento do onSubmit() que estava faltando

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