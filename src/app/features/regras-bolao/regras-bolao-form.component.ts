// src/app/components/regras-bolao/regras-bolao.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// Angular Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-regras-bolao',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  templateUrl: './regras-bolao-form.component.html',
  styleUrls: ['./regras-bolao-form.component.scss']
})
export class RegrasBolaoComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit(): void {
    // A lógica de inicialização pode ser adicionada aqui, se necessário.
    // Por exemplo, carregar regras de um serviço, etc.
  }

  // Método para voltar para a página anterior
  goBack(): void {
    window.history.back();
  }

  // Outros métodos de navegação, se houver
  // goBackToDashboard(): void {
  //   this.router.navigate(['/dashboard']);
  // }
}