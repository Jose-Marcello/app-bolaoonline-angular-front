import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {

  constructor(private snackBar: MatSnackBar) { }

  /**
   * Exibe uma notificação para o usuário usando o MatSnackBar.
   * @param message A mensagem a ser exibida.
   * @param type O tipo da notificação (ex: 'sucesso', 'erro', 'alerta').
   */
  showNotification(message: string, type: string): void {
    let panelClass: string | string[] = 'default-snackbar';
    if (type) {
      panelClass = `${type}-snackbar`;
    }

    this.snackBar.open(message, 'Fechar', {
      duration: 5000,
      panelClass: [panelClass]
    });
    
  }

}