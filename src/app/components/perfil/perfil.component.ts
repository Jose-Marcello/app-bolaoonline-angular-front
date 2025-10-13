// Localização: src/app/pages/perfil/perfil.component.ts

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApostadorService } from '@services/apostador.service';
import { finalize } from 'rxjs/operators';
import { ApostadorDto } from '@models/apostador/apostador-dto.model';
import { ApiResponse, isPreservedCollection } from '@models/common/api-response.model';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { Observable, of } from 'rxjs';
import { FileUploadService } from '@services/file-upload.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { AuthService } from '@auth/auth.service';

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

  constructor(
    private fb: FormBuilder,
    private apostadorService: ApostadorService,
    private snackBar: MatSnackBar,
    private router: Router,
    private fileUploadService: FileUploadService,
    private http: HttpClient,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.iniciarFormulario();
    this.carregarDadosDoApostador();
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
          const apostadorData = isPreservedCollection<ApostadorDto>(response.data) ? (response.data.$values && response.data.$values.length > 0 ? response.data.$values[0] : null) : response.data as ApostadorDto;
          
          if (apostadorData) {
            this.apostadorAtual = apostadorData;
            
            const celularLimpo = this.limparNumero(this.apostadorAtual.celular || '');
            
            this.perfilForm.patchValue({
              apelido: this.apostadorAtual.apelido,
              celular: celularLimpo,
              fotoPerfil: this.apostadorAtual.fotoPerfil
            });            
            this.fotoPerfilPreviewUrl = `${environment.apiUrl}${apostadorData.fotoPerfil}`;
            
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

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      if (file.size > this.fotoPerfilMaxFileSize) {
        this.showSnackBar('O arquivo excede o tamanho máximo permitido (5 MB).', 'Fechar', 'error');
        return;
      }
      this.isLoading = true;
      this.fileUploadService.uploadFile(file).pipe(
        finalize(() => this.isLoading = false)
      ).subscribe(
        (url: string) => {
          this.perfilForm.get('fotoPerfil')?.setValue(url);
          this.perfilForm.markAsDirty();
          // ADICIONE O CAMINHO COMPLETO DO BACKEND À URL
          this.fotoPerfilPreviewUrl = `${environment.apiUrl}${url}`;
          this.showSnackBar('Foto enviada com sucesso.', 'Fechar', 'success');
        },
        error => {
          console.error('Erro no upload do arquivo:', error);
          this.showSnackBar('Erro no upload da foto.', 'Fechar', 'error');
        }
      );
    }
  }

  onSubmit(): void {
    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      this.showSnackBar('Por favor, preencha os campos corretamente.', 'Fechar', 'error');
      return;
    }
    
    if (this.perfilForm.pristine) {
      this.showSnackBar('Nenhuma alteração detectada.', 'Fechar', 'info');
      return;
    }

    this.isLoading = true;
    this.apostadorService.atualizarPerfil(this.perfilForm.value).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (response: ApiResponse<any>) => {
        if (response.success) {
          this.showSnackBar('Perfil atualizado com sucesso!', 'Fechar', 'success');
          this.carregarDadosDoApostador();
        } else {
          this.showSnackBar(response.message || 'Erro ao atualizar o perfil.', 'Fechar', 'error');
        }
      },
      error: () => {
        this.showSnackBar('Erro de conexão ao atualizar o perfil.', 'Fechar', 'error');
      }
    });
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