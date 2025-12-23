// src/app/menu/menu.component.ts
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-menu',
  standalone: true,
  // Importação dos módulos necessários para o HTML externo
  imports: [
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    NgFor,
    NgIf,
  ],
  templateUrl: './menu.component.html', // APONTA PARA O HTML FORNECIDO
  styleUrls: ['./menu.component.css']
})
export class MenuComponent {
  // O componente pode conter lógica para esconder/mostrar itens, ou gerenciar o estado de login
  
  // Exemplo de como gerenciar a lista de links via TypeScript
  // Embora no seu HTML estejam fixos, esta é a forma mais profissional
  public menuItems = [
    { name: 'Home', route: '/home', icon: 'home', category: 'PRINCIPAIS' },
    { name: 'Questões', route: '/questoes', icon: 'description', category: '✏️ Cadastros' },
    { name: 'Disciplinas', route: '/disciplinas', icon: 'book', category: '✏️ Cadastros' },
    { name: 'Gerar Provas', route: '/provas', icon: 'print', category: '📋 Montagem', disabled: true },
    { name: 'Relatórios', route: '/relatorios', icon: 'analytics', category: '📋 Montagem', disabled: true },
  ];
}