import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ClipboardModule, ClipboardService } from 'ngx-clipboard';
import { Subscription, finalize, filter, switchMap, take, map } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';

import { AuthService } from '../../../features/auth/services/auth.service';
import { FinanceiroService } from '../../../core/services/financeiro.service';
import { ApostadorService } from '../../../core/services/apostador.service';
import { PixResponseDto } from '../../../features/financeiro/models/pix-response.model';
import { ApostadorDto } from '../../../features/apostador/models/apostador-dto.model';
import { isPreservedCollection } from '../../../shared/models/api-response.model';

@Component({
  selector: 'app-depositar',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatSnackBarModule, ClipboardModule
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

  // DECLARAÇÃO DAS VARIÁVEIS (Resolve o erro da image_967da7.jpg)
  campeonatoId: string | null = null;
  rodadaId: string | null = null;
  
  private subscriptions: Subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private financeiroService: FinanceiroService,
    private apostadorService: ApostadorService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private clipboardService: ClipboardService
  ) {
    this.depositoForm = this.fb.group({
      // Validação: Mínimo 1 real e não aceita negativos
      valor: ['', [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    // Captura parâmetros para o retorno inteligente
    this.campeonatoId = this.route.snapshot.queryParamMap.get('campeonatoId');
    this.rodadaId = this.route.snapshot.queryParamMap.get('rodadaId');

    this.subscriptions.add(
      this.authService.isAuthenticated$.pipe(
        filter(isAuthenticated => isAuthenticated),
        switchMap(() => this.apostadorService.getDadosApostador()),
        map(response => {
          if (response.success && response.data) {
            return isPreservedCollection<ApostadorDto>(response.data) 
              ? (response.data.$values?.[0] || null) 
              : (response.data as ApostadorDto);
          }
          return null;
        }),
        filter(apostador => !!apostador?.id),
        take(1)
      ).subscribe(apostador => {
        this.apostadorId = apostador!.id;
      })
    );
  }

  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }

  onSubmit(): void {
    if (this.depositoForm.valid && this.apostadorId) {
      this.isLoading = true;
      // Garante que o valor enviado seja absoluto (positivo)
      const valor = Math.abs(this.depositoForm.value.valor);
      
      this.financeiroService.depositar({ apostadorId: this.apostadorId, valor }).pipe(
        finalize(() => this.isLoading = false)
      ).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.pixResponse = response.data;
            this.showPixScreen = true;
            this.showSnackBar('PIX gerado com sucesso!', 'OK', 'success');
          }
        }
      });
    }
  }

  simularPagamento(): void {
    if (this.pixResponse?.chaveTransacao && this.depositoForm.valid) {
      this.isLoading = true;
      const valor = Math.abs(this.depositoForm.value.valor);

      this.financeiroService.simularWebhook(this.pixResponse.chaveTransacao, valor).subscribe({
        next: (response) => {
          if (response.success) {
            this.apostadorService.getDadosApostador().subscribe(() => {
              this.isLoading = false;
              if (this.campeonatoId && this.rodadaId) {
                this.router.navigate(['/apostas-rodada', this.campeonatoId, this.rodadaId]);
              } else {
                this.router.navigate(['/dashboard']);
              }
            });
          }
        },
        error: () => this.isLoading = false
      });
    }
  }

  goBackToDashboard(): void { this.router.navigate(['/dashboard']); }

  copiarPix(): void {
    if (this.pixResponse?.pixCopiaECola) {
      this.clipboardService.copyFromContent(this.pixResponse.pixCopiaECola);
      this.showSnackBar('PIX copiado!', 'OK', 'success');
    }
  }

  private showSnackBar(message: string, action: string, type: string): void {
    this.snackBar.open(message, action, {
      duration: 3000,
      panelClass: [`snackbar-${type}`]
    });
  }
}