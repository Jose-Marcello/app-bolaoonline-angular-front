import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ClipboardModule, ClipboardService } from 'ngx-clipboard';
import { Subscription, finalize, filter, switchMap, take, map } from 'rxjs';
import { Observable } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

// Services
import { AuthService } from '@auth/auth.service';
import { FinanceiroService } from '@services/financeiro.service';
import { ApostadorService } from '@services/apostador.service';

// Models
import { DepositarRequestDto } from '@models/financeiro/depositar-request-dto.model';
import { PixResponseDto } from '@models/financeiro/pix-response.model';
import { isPreservedCollection } from '@models/common/api-response.model';
import { ApostadorDto } from '@models/apostador/apostador-dto.model';

@Component({
  selector: 'app-depositar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    ClipboardModule
  ],
  templateUrl: './depositar.component.html',
  styleUrls: ['./depositar.component.scss']
})
export class DepositarComponent implements OnInit, OnDestroy {
  depositoForm: FormGroup;
  apostadorId: string | null = null;
  isLoading: boolean = false;
  pixResponse: PixResponseDto | null = null;
  showPixScreen = false;
  
  private subscriptions: Subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private financeiroService: FinanceiroService,
    private apostadorService: ApostadorService,
    private snackBar: MatSnackBar,
    private router: Router,
    private clipboardService: ClipboardService
  ) {
    this.depositoForm = this.fb.group({
      valor: ['', [Validators.required, Validators.min(1), Validators.pattern(/^\d+(\.\d{1,2})?$/)]]
    });
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.authService.isAuthenticated$.pipe(
        filter(isAuthenticated => isAuthenticated),
        switchMap(() => this.apostadorService.getDadosApostador()),
        map(response => {
          if (response.success && response.data) {
            const apostadorData = isPreservedCollection<ApostadorDto>(response.data) ? (response.data.$values && response.data.$values.length > 0 ? response.data.$values[0] : null) : response.data as ApostadorDto;
            return apostadorData;
          }
          return null;
        }),
        filter(apostador => !!apostador?.id),
        take(1)
      ).subscribe(apostador => {
        this.apostadorId = apostador!.id;
        console.log('[DepositarComponent] Apostador ID carregado:', this.apostadorId);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onSubmit(): void {
    if (this.depositoForm.valid && this.apostadorId) {
      this.isLoading = true;
      const valor = this.depositoForm.value.valor;
      
      const request: DepositarRequestDto = {
        apostadorId: this.apostadorId,
        valor: parseFloat(valor)
      };

      this.subscriptions.add(
        this.financeiroService.depositar(request).pipe(
          finalize(() => this.isLoading = false)
        ).subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.showSnackBar('Solicitação de PIX gerada com sucesso!', 'Fechar', 'success');
              
              this.pixResponse = response.data;
              this.showPixScreen = true;
            } else {
              this.showSnackBar(response.message || 'Erro ao processar depósito.', 'Fechar', 'error');
            }
          },
          error: (error) => {
            this.showSnackBar('Erro de conexão. Tente novamente.', 'Fechar', 'error');
            console.error('Erro no depósito:', error);
          }
        })
      );
    } else {
      this.showSnackBar('Por favor, insira um valor válido para o depósito.', 'Fechar', 'warning');
    }
  }

  // Novo método para simular o pagamento via webhook
  simularPagamento(): void {
    if (this.pixResponse?.chaveTransacao && this.depositoForm.valid) {
      const valor = this.depositoForm.value.valor;

      this.subscriptions.add(
        this.financeiroService.simularWebhook(this.pixResponse.chaveTransacao, valor).subscribe({
          next: (response) => {
            if (response.success) {
              this.showSnackBar('Pagamento simulado com sucesso! O saldo será atualizado.', 'Fechar', 'success');
              this.router.navigate(['/dashboard/financeiro']);
            } else {
              this.showSnackBar(response.message || 'Erro na simulação de pagamento.', 'Fechar', 'error');
            }
          },
          error: (err) => {
            this.showSnackBar('Erro de conexão ao simular pagamento.', 'Fechar', 'error');
            console.error(err);
          }
        })
      );
    } else {
      this.showSnackBar('Dados da transação incompletos para simular.', 'Fechar', 'warning');
    }
  }

  goBackToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  copiarPix(): void {
    if (this.pixResponse?.pixCopiaECola) {
        this.clipboardService.copyFromContent(this.pixResponse.pixCopiaECola);
        this.showSnackBar('Código PIX copiado para a área de transferência!', 'Fechar', 'success');
    }
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
