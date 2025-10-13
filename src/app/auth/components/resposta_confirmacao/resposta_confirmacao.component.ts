import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-resposta-confirmacao',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-screen w-screen flex items-center justify-center text-bolao-text-light" style="background-image: url('/assets/images/fundobolao.png'); background-size: cover; background-position: center; background-attachment: fixed;">
      <div class="max-w-md w-full bg-bolao-card-bg p-8 rounded-lg shadow-xl text-center">
        <img src="/assets/images/logobolao.png" alt="Logo Bolão Online" class="w-24 h-24 mx-auto mb-4 rounded-full border-2 border-bolao-green-light">
        <h2 class="text-2xl font-extrabold text-bolao-green-light mb-4">
          {{ mensagem }}
        </h2>
        <div *ngIf="status === 'sucesso'">
          <button (click)="navigateToLogin()" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-bolao-green-dark hover:bg-bolao-green-dark/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bolao-green-dark">
            Ir para o Login
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./resposta-confirmacao.component.scss']
})
export class RespostaConfirmacaoComponent implements OnInit {
  status: string | null = null;
  mensagem: string | null = null;

  constructor(private route: ActivatedRoute, private router: Router) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.status = params['status'];
      this.mensagem = params['mensagem'];
    });
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}