import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-confirmacao-aposta-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="bg-gray-800 text-white p-6 rounded-lg border border-gray-700">
      <h2 mat-dialog-title class="text-blue-400 font-black uppercase tracking-tighter">
        Confirmar Aposta Avulsa
      </h2>
      <mat-dialog-content class="my-4 text-gray-300">
        <p>Você está prestes a criar uma nova aposta para a <strong>Rodada {{data.rodada}}</strong>.</p>
        <p class="mt-2 text-sm">Custo da operação: <span class="text-green-400 font-bold">R$ {{data.valor | number:'1.2-2'}}</span></p>
      </mat-dialog-content>
      <mat-dialog-actions align="end" class="gap-2">
        <button mat-button (click)="onNoClick()" class="text-gray-400 uppercase font-bold text-xs">Cancelar</button>
        <button mat-flat-button [mat-dialog-close]="true" class="bg-blue-600 hover:bg-blue-700 text-white uppercase font-black px-6">
          Confirmar
        </button>
      </mat-dialog-actions>
    </div>
  `
})
export class ConfirmacaoApostaDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmacaoApostaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}