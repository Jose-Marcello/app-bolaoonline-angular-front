import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; // Importante para os avisos
import { CampeonatoService } from '../../../core/services/campeonato.service'; // Ajuste o caminho conforme seu projeto
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-confirmacao-adesao-modal',
  standalone: true,
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, 
    MatIconModule, CurrencyPipe, MatSnackBarModule
  ],
  template: `
    <div class="bg-[#1e293b] border-2 border-indigo-500/50 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
  <div class="p-6 text-center border-b border-slate-700 bg-slate-900/40">
    <div class="inline-flex items-center justify-center w-16 h-16 bg-amber-500/20 rounded-full mb-4 border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
      <span class="text-3xl">🏆</span>
    </div>
    <h3 class="text-xl font-black text-white uppercase italic tracking-tighter">
      Aderir ao {{ data.campeonato.nome }}
    </h3>
    <p class="text-slate-300 text-[10px] mt-1 font-bold uppercase tracking-widest">
      Investimento único: <span class="text-amber-400 text-base ml-1">{{ (data.campeonato.custoAdesao || 0) | currency:'BRL' }}</span>
    </p>
  </div>

  <div class="p-6 space-y-4">
    <div class="bg-indigo-600/20 border border-indigo-400/30 p-4 rounded-xl text-center">
      <p class="text-[12px] font-black text-indigo-200 uppercase leading-relaxed">
        🔥 DISPUTE OS GRANDES PRÊMIOS <br>
        <span class="text-white text-sm">PARA OS 3 PRIMEIROS COLOCADOS!</span>
      </p>
    </div>
    
    <p class="text-[11px] text-slate-300 font-medium text-center leading-relaxed italic">
      "Vença a rodada e recupere seu investimento imediatamente através do nosso sistema de cashback premiado."
    </p>
  </div>

  <div class="p-4 bg-slate-900 flex gap-3">
    <button mat-button 
            [disabled]="isAderindo"
            class="flex-1 text-slate-400 hover:text-white font-black uppercase text-[10px] tracking-widest" 
            (click)="onCancelar()">
      DESISTIR
    </button>
    <button mat-raised-button 
            [disabled]="isAderindo"
            class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] tracking-widest rounded-lg shadow-lg shadow-indigo-900/20" 
            (click)="confirmarAdesao()">
      <span *ngIf="!isAderindo">CONFIRMAR</span>
      <span *ngIf="isAderindo">PROCESSANDO...</span>
    </button>
  </div>
</div>
  `,
  styles: [`
    :host { display: block; width: 100%; max-width: 350px; }
    ::ng-deep .mat-mdc-dialog-container .mdc-dialog__surface { background-color: transparent !important; box-shadow: none !important; }
  `]
})


export class ConfirmacaoAdesaoModalComponent {
  isAderindo = false;

  

  constructor(
    public dialogRef: MatDialogRef<ConfirmacaoAdesaoModalComponent>,
    private snackBar: MatSnackBar,
    private campeonatoService: CampeonatoService,
    @Inject(MAT_DIALOG_DATA) public data: { campeonato: any, apostador: any }
  ) {}

  onCancelar(): void {
    this.dialogRef.close(false);
  }

  confirmarAdesao() {
  // --- 📝 LOGS DE ENTRADA (O que temos no modal?) ---
  console.log('--- [DEBUG] INÍCIO DA ADESÃO ---');
  console.log('Dados do Campeonato:', this.data.campeonato);
  console.log('ID do Campeonato:', this.data.campeonato?.id);

  // 🛑 1. Verificação de Custo
  if (!this.data.campeonato.custoAdesao || this.data.campeonato.custoAdesao <= 0) {
    this.snackBar.open('⚠️ Erro: Campeonato sem valor de adesão definido.', 'Entendi', { duration: 5000 });
    return;
  }

  // 🛑 2. Verificação de Saldo
  const saldoAtual = this.data.apostador?.saldo?.valor || 0;
  console.log('Saldo do Apostador:', saldoAtual);

  if (saldoAtual < this.data.campeonato.custoAdesao) {
    this.snackBar.open('❌ Saldo insuficiente para esta adesão.', 'OK', { duration: 5000 });
    return;
  }

  this.isAderindo = true;

  // 🚀 MONTAGEM DO PAYLOAD (A chave para matar o 400)
  const payload = {
    CampeonatoId: this.data.campeonato.id 
  };

  /*
  const payload = {
    campeonatoId: this.data.campeonato.id
  };
  */

  console.log('--- [DEBUG] PAYLOAD SENDO ENVIADO PARA O SERVICE ---');
  console.log('Payload:', JSON.stringify(payload));

  this.campeonatoService.entrarEmCampeonato(payload) 
    .pipe(
      finalize(() => this.isAderindo = false),
      catchError(err => {
        // --- 📝 LOG DE ERRO (O que o Azure respondeu?) ---
        console.error('--- [DEBUG] ERRO NA RESPOSTA DO AZURE ---');
        console.error('Status do Erro:', err.status);
        console.error('Corpo do Erro (Backend):', err.error);
        
        const msg = err.error?.message || 'Erro ao processar adesão.';
        this.snackBar.open('❌ ' + msg, 'OK', { duration: 5000 });
        return of(null);
      })
    )
    .subscribe(res => {
      if (res && res.success) {
        console.log('--- [DEBUG] SUCESSO TOTAL! ---', res);
        this.snackBar.open('🏆 Adesão realizada com sucesso!', 'Boa sorte!', { duration: 3000 });
        this.dialogRef.close(true);
      }
    });
  }
}
