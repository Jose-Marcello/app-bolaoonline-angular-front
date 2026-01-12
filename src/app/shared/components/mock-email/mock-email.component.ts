import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';
import { MockEmailData } from '../../../core/services/mock-email.service';


@Component({
  selector: 'app-mock-email',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './mock-email.component.html',
  styleUrls: ['./mock-email.component.css']
})
export class MockEmailComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  private dialogRef = inject(MatDialogRef<MockEmailComponent>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: MockEmailData) {}

  onConfirmClick(): void {
    // 1. Extraímos os parâmetros da URL mock para processar via código
    const url = new URL(this.data.link);
    const userId = url.searchParams.get('userId') || '';
    const code = url.searchParams.get('code') || '';

    // 2. Chamada silenciosa ao backend para confirmar o e-mail
    this.authService.confirmEmail(userId, code).subscribe({
      next: () => {
        // 3. Sucesso: Fecha o modal e redireciona para o login
        this.dialogRef.close();
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        console.error('Erro na confirmação mock:', err);
        // Mesmo em erro, fechamos para garantir a fluidez da demo
        this.dialogRef.close();
        this.router.navigate(['/auth/login']);
      }
    });
  }
}