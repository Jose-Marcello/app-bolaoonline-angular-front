// src/app/home/home.component.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Necessário para diretivas como *ngIf ou *ngFor (caso use)
import { MatCardModule } from '@angular/material/card'; // 👈 Importação de MatCard
import { MatIconModule } from '@angular/material/icon'; // 👈 Importação de MatIcon

@Component({
  selector: 'app-home',
  standalone: true,
  // 👈 Incluindo os Módulos no array imports
  imports: [CommonModule, MatCardModule, MatIconModule], 
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  // Variáveis para simular dados do Dashboard (pode ser substituído por Signals)
  totalDisciplinas = 5;
  totalQuestoes = 120;
}