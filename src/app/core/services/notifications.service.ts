import { Injectable } from '@angular/core';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Observable } from 'rxjs';

// Defina a interface para o tipo de notificação
export interface Notification {
  message: string;
  // ✅ CORRIGIDO: Adicionado 'erro' (em português) para evitar o erro de compilação TS2345
  type: 'success' | 'error' | 'warning' | 'info' | 'alerta' | 'sucesso' | 'erro'; 
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  // Use null ou undefined para representar o estado 'sem notificação'
  private notificationSubject = new BehaviorSubject<Notification | null>(null);
  notification$: Observable<Notification | null> = this.notificationSubject.asObservable();

  //constructor() { }
  constructor(private snackBar: MatSnackBar) { }

  /**
   * Exibe uma nova notificação.
   * @param message A mensagem a ser exibida.
   * @param type O tipo de notificação (para styling).
   */
  showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' | 'alerta' | 'sucesso' | 'erro'): void {
    const notification: Notification = { message, type };
    this.notificationSubject.next(notification);
    
    // Auto-limpa após 5 segundos (exemplo)
    setTimeout(() => {
      this.clearNotifications();
    }, 5000);
  }

showNotificationWithAction(
    message: string, 
    type: 'sucesso' | 'erro' | 'aviso', 
    actionText: string, 
    actionCallback: () => void
  ) {
    const panelClass = this.getPanelClass(type);

    // Abre o SnackBar com o texto da ação
    const snackBarRef = this.snackBar.open(message, actionText, {
      duration: 8000, // Dá mais tempo para o usuário clicar
      panelClass: [panelClass]
    });

    // Se o usuário clicar na ação do SnackBar, execute o callback (que chama requestEmailConfirmationResend)
    snackBarRef.onAction().subscribe(() => {
      console.log('Ação da notificação executada.');
      actionCallback(); 
    });
  }

// Método auxiliar para classes CSS (se estiver usando Material/Toastr)
  private getPanelClass(type: string): string {
    switch (type) {
      case 'sucesso': return 'snackbar-success';
      case 'erro': return 'snackbar-error';
      case 'aviso': return 'snackbar-warning';
      default: return 'snackbar-info';
    }
  }

  /**
   * Limpa imediatamente a notificação atual.
   * Esta é a função que o ResetPasswordComponent estava chamando!
   */
  clearNotifications(): void {
    // Emite null para limpar o estado
    this.notificationSubject.next(null);
  }
}