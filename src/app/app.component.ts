// src/app/app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// O LayoutComponent NÃO deve ser importado se você o usa APENAS no roteador
// Remova: import { LayoutComponent } from './layout/layout/layout.component'; 

@Component({
  selector: 'app-root',
  standalone: true,
  // Imports: Apenas o RouterOutlet é necessário para a rota principal
  imports: [RouterOutlet], 
  
  // O template DEVE chamar APENAS o router-outlet
  template: `
    <router-outlet></router-outlet> 
  `,
})
export class AppComponent {
  title = 'PocBancoDeItens';
}