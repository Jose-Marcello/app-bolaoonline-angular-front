import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-confirmacao-aposta-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    CurrencyPipe
  ],
  template: `
    <mat-card class="bg-black-600 text-black rounded-lg shadow-xl p-6 relative">
      <mat-card-header class="pb-4 flex items-center">
        <mat-icon class="text-yellow-600 text-3xl mr-4 ">warning</mat-icon>
        <mat-card-title class="text-xl font-bold">Confirmação de Aposta</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p class="text-lg mb-4 text-gray-700">
          Deseja criar uma nova aposta avulsa no valor de R$ {{ data.valorAposta }}? Este valor será debitado do seu saldo.
        </p>
        <div *ngIf="data.valorAposta" class="flex items-center justify-center text-5xl font-extrabold text-green-400">
          <p>{{ data.valorAposta | currency:'BRL':'symbol':'1.2-2' }}</p>
        </div>
      </mat-card-content>
      <mat-card-actions class="flex justify-end pt-4">
        <button mat-button class="text-gray-400 hover:text-white" (click)="onCancelar()">
          Cancelar
        </button>
        <button mat-raised-button color="primary" class="bg-green-600 hover:bg-green-700 text-white" (click)="onConfirmar()">
          OK
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      max-width: 400px;
    }
  `]
})
export class ConfirmacaoApostaModalComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmacaoApostaModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mensagem: string; valorAposta: number }
  ) {}

  onConfirmar(): void {
    this.dialogRef.close(true);
  }

  onCancelar(): void {
    this.dialogRef.close(false);
  }
}
