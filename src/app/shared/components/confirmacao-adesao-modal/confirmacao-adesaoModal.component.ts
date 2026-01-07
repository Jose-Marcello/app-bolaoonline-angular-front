import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';


@Component({
  selector: 'app-confirmacao-adesao-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, CurrencyPipe],
  template: `
    <div class="bg-[#0f172a] border border-indigo-500/30 rounded-2xl overflow-hidden shadow-2xl">
      <div class="p-6 text-center border-b border-slate-800">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-indigo-600/20 rounded-full mb-4 border border-indigo-500/50 shadow-[0_0_20px_rgba(79,70,229,0.3)]">
          <span class="text-3xl">🏆</span>
        </div>
        <h3 class="text-xl font-black text-white uppercase italic tracking-tighter">
          Aderir ao Campeonato
        </h3>
        <p class="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-widest">
          Investimento único: <span class="text-emerald-400 text-sm">R$ 100,00</span>
        </p>
      </div>

      <div class="p-6 space-y-4">
        <div class="bg-indigo-600/10 border border-indigo-500/20 p-4 rounded-xl text-center">
          <p class="text-[12px] font-black text-indigo-300 uppercase leading-relaxed">
            🔥 DISPUTE OS GRANDES PRÊMIOS <br>
            <span class="text-white text-sm">PARA OS 3 PRIMEIROS COLOCADOS!</span>
          </p>
        </div>
        
        <p class="text-[11px] text-slate-400 font-bold text-center leading-relaxed italic">
          "Vença a rodada e recupere seu investimento imediatamente através do nosso sistema de cashback premiado."
        </p>
      </div>

      <div class="p-4 bg-slate-900/50 flex gap-3">
        <button mat-button class="flex-1 text-slate-500 font-black uppercase text-[10px] tracking-widest" (click)="onCancelar()">
          DESISTIR
        </button>
        <button mat-raised-button class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] tracking-widest rounded-lg" (click)="onConfirmar()">
          CONFIRMAR
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
  constructor(
    public dialogRef: MatDialogRef<ConfirmacaoAdesaoModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { campeonatoNome: string }
  ) {}

  onConfirmar(): void { this.dialogRef.close(true); }
  onCancelar(): void { this.dialogRef.close(false); }
}