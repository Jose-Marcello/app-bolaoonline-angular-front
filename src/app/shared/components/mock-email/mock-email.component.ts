import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
// Importações necessárias para usar o componente como um Diálogo
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { MockEmailData } from '../../../core/services/mock-email.service';


@Component({
  selector: 'app-mock-email',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './mock-email.component.html',
  styleUrls: ['./mock-email.component.css']
})
export class MockEmailComponent {
  // O router e o dialogRef ainda são injetados, mas o método closeAndGoToLogin não é mais usado
  private router = inject(Router); 
  private dialogRef: MatDialogRef<MockEmailComponent> = inject(MatDialogRef);

  // Injete os dados passados pelo serviço (MockEmailService)
  constructor(@Inject(MAT_DIALOG_DATA) public data: MockEmailData) {}
  
  // O método closeAndGoToLogin foi removido, pois o foco agora é na ação do link.
  // A ação de redirecionamento é feita pelo clique no link [href]
}