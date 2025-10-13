// Localização: src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    ReactiveFormsModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'BolaoOnlineAppV5';

  constructor() { }

  ngOnInit(): void {
    // Nesta fase inicial, não precisamos de lógica complexa aqui.
    // Apenas garantimos que o router-outlet está pronto para exibir as rotas.
    console.log('[AppComponent] Iniciado.');
  }
}