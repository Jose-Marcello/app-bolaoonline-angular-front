import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
//import { MockEmailDialogComponent } from '@angular/material/dialog';
import { MockEmailComponent } from '../../shared/components/mock-email/mock-email.component';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';


export interface MockEmailData {
    email: string;
    link: string;
    actionType: 'confirm' | 'reset'; // Pode ser 'confirm' para Confirmação de Cadastro ou 'reset' para Redefinição de Senha
}


@Injectable({
  providedIn: 'root'
})
export class MockEmailService {
  private dialog = inject(MatDialog);

  constructor() { }

  /**
   * Abre o Diálogo do Mock de E-mail com os dados necessários.
   * @param email O e-mail usado no registro.
   * @param confirmationLink O link de confirmação gerado pelo backend.
   * @returns Um Observable que emite o resultado ao fechar o diálogo.
   */
  openMockEmailDialog(email: string, link: string, type: 'confirm' | 'reset'): Observable<any> {
    const dialogRef = this.dialog.open(MockEmailComponent, {
        data: { 
            email, 
            link, 
            actionType: type // <--- NOVO PARÂMETRO
        }
    });
    return dialogRef.afterClosed();
}
}