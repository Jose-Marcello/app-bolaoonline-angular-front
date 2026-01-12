import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { MockEmailComponent } from '../../shared/components/mock-email/mock-email.component';

export interface MockEmailData {
    email: string;
    link: string;
    actionType: 'confirm' | 'reset';
}

@Injectable({
  providedIn: 'root'
})
export class MockEmailService {
  private dialog = inject(MatDialog);

  openMockEmailDialog(email: string, link: string, type: 'confirm' | 'reset'): Observable<any> {
    const dialogRef = this.dialog.open(MockEmailComponent, {
        width: '500px', // Opcional: define uma largura melhor para o "e-mail"
        data: { 
            email, 
            link, 
            actionType: type 
        }
    });
    return dialogRef.afterClosed();
  }
}