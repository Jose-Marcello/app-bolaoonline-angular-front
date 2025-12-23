// Localização: src/app/pages/perfil/perfil.component.ts

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApostadorService } from '../../core/services/apostador.service';
import { finalize } from 'rxjs/operators';
import { ApostadorDto } from '../../features/apostador/models/apostador-dto.model';
import { ApiResponse, isPreservedCollection } from '../../shared/models/api-response.model';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { Observable, of } from 'rxjs';
import { FileUploadService } from '../../core/services/file-upload.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/auth/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';; 

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatIconModule
  ],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss']
})
export class PerfilComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef;
  perfilForm!: FormGroup;
  isLoading: boolean = false;
  apostadorAtual: ApostadorDto | null = null;
  fotoPerfilPreviewUrl: string | null = null;
  private readonly fotoPerfilMaxFileSize = 5242880; // 5 MB
  emailForm!: FormGroup;
  isEmailLoading = false; // Variável de loading para este formulário
  // Adicione as variáveis necessárias

  readonly API_URL = 'https://localhost:5001';

  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private apostadorService: ApostadorService,
    private snackBar: MatSnackBar,
    private router: Router,
    private fileUploadService: FileUploadService,
    private http: HttpClient,
    private authService: AuthService,
    private notificationsService: NotificationsService
  ) { }

  ngOnInit(): void {
    this.iniciarFormulario();
    this.carregarDadosDoApostador();

    // Inicialização do Formulário de Troca de E-mail
    this.emailForm = this.fb.group({
        newEmail: ['', [Validators.required, Validators.email]],
        currentPassword: ['', Validators.required]
    });

  }

  // Crie a função de submit:
onChangeEmail(): void {
    if (this.emailForm.invalid) return;

    this.isEmailLoading = true;
    
    // 1. Extrair os valores: this.emailForm.value.newEmail e this.emailForm.value.currentPassword
    // 2. Chamar a API de troca de e-mail (que exigirá um endpoint no backend)
    // 3. Tratar a resposta: Se sucesso, mostrar notificação e talvez deslogar o usuário por segurança.

    // Exemplo de notificação de sucesso:
    this.notificationsService.showNotification('Link de confirmação enviado para o novo e-mail.', 'sucesso');
    this.isEmailLoading = false;
}
  ngOnDestroy(): void {
    // ...
  }

  iniciarFormulario(): void {
    this.perfilForm = this.fb.group({
      fotoPerfil: ['', Validators.required],
      apelido: ['', Validators.required],
      celular: ['', [Validators.required, Validators.pattern(/^\d{10,11}$/)]]
    });
  }

  private carregarDadosDoApostador(): void {
    this.isLoading = true;
    this.apostadorService.getDadosApostador().pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (response: ApiResponse<ApostadorDto>) => {
        if (response.success && response.data) {
          // Sua lógica de extração que já funciona
          const apostadorData = isPreservedCollection<ApostadorDto>(response.data) 
            ? (response.data.$values && response.data.$values.length > 0 ? response.data.$values[0] : null) 
            : response.data as ApostadorDto;
          
          if (apostadorData) {
            this.apostadorAtual = apostadorData;
            
            const celularLimpo = this.limparNumero(this.apostadorAtual.celular || '');
            
            this.perfilForm.patchValue({
              apelido: this.apostadorAtual.apelido,
              celular: celularLimpo,
              fotoPerfil: this.apostadorAtual.fotoPerfil
            });            

            // --- CORREÇÃO AQUI ---
            // Usamos 'apostadorData' que você já tratou acima, em vez de 'res'
            //if (apostadorData.fotoPerfil) {
            //    this.fotoPerfilPreviewUrl = `${this.API_URL}${apostadorData.fotoPerfil}`;
            if (apostadorData && apostadorData.fotoPerfil) {
                const path = apostadorData.fotoPerfil.startsWith('/') ? apostadorData.fotoPerfil.substring(1) : apostadorData.fotoPerfil;
               this.fotoPerfilPreviewUrl = `${this.API_URL}/${path}`;
            }
            // ---------------------
            
            this.perfilForm.markAsPristine();
          } else {
            this.showSnackBar('Erro ao carregar os dados do perfil.', 'Fechar', 'error');
          }
        } else {
          this.showSnackBar('Erro ao carregar os dados do perfil.', 'Fechar', 'error');
        }
      },
      error: () => {
        this.showSnackBar('Erro de conexão ao carregar o perfil.', 'Fechar', 'error');
      }
    });
  }

  private limparNumero(numero: string): string {
    return numero.replace(/\D/g, '');
  }

  // Método disparado quando o usuário escolhe a foto
onFileSelected(event: any): void {

  const file = event.target.files[0];
  if (file) {
    // 1. ISSO MOSTRA A FOTO NA HORA (Cria uma URL temporária na memória do navegador)
    this.fotoPerfilPreviewUrl = URL.createObjectURL(file);

    // 2. Dispara o salvamento automático no C#
    this.uploadFoto(file);
  } 
}

// No perfil.component.ts
voltar() {
  // Isso faz o sistema retornar ao dashboard de forma oficial
  this.router.navigate(['/dashboard']); 
}


// Método que envia o binário para o ApostadorController
private uploadFoto(file: File): void {
  const formData = new FormData();
  formData.append('file', file); // 'file' deve bater com o nome no parâmetro do C#

  this.isLoading = true;

  this.apostadorService.uploadFoto(formData).subscribe({
    next: (res: any) => {
      this.isLoading = false;
      // O backend retorna o caminho salvo (dbPath)
      console.log('Foto salva com sucesso:', res.fotoUrl);
      // Aqui você pode atualizar o DTO ou exibir um alerta de sucesso
    },
    error: (err) => {
      this.isLoading = false;
      console.error('Erro no upload:', err);
      this.fotoPerfilPreviewUrl = null; // Remove o preview se deu erro
    }
  });
}
 onSubmit() {
  if (this.perfilForm.valid) {
    this.isLoading = true;
    this.apostadorService.atualizarPerfil(this.perfilForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        // Navega para o dashboard após salvar
        this.router.navigate(['/dashboard']); 
      },
      error: () => this.isLoading = false
    });
  }
}

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  private showSnackBar(message: string, action: string = 'Fechar', type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    let panelClass: string[] = [];
    if (type === 'success') {
      panelClass = ['snackbar-success'];
    } else if (type === 'error') {
      panelClass = ['snackbar-error'];
    } else if (type === 'warning') {
      panelClass = ['snackbar-warning'];
    } else if (type === 'info') {
      panelClass = ['snackbar-info'];
    }

    this.snackBar.open(message, action, {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: panelClass
    });
  }
}