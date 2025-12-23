// Localização: src/app/auth/components/confirm-email/confirm-email.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@auth/auth.service';
import { NotificationsService } from '@services/notifications.service';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-screen w-screen flex items-center justify-center text-bolao-text-light" style="background-image: url('/assets/images/fundobolao.png'); background-size: cover; background-position: center; background-attachment: fixed;">
      <div class="max-w-md w-full bg-bolao-card-bg p-8 rounded-lg shadow-xl text-center">
        <img src="/assets/images/logobolao.png" alt="Logo Bolão Online" class="w-24 h-24 mx-auto mb-4 rounded-full border-2 border-bolao-green-light">
        <h2 class="text-2xl font-extrabold text-bolao-green-light mb-4">
          Estamos processando a confirmação do seu e-mail...
        </h2>
        <p class="text-bolao-text-light">Aguarde um momento. Você será redirecionado em breve.</p>
        <p class="mt-4" *ngIf="errorMessage">
          Ocorreu um erro: <span class="text-red-500">{{ errorMessage }}</span>
        </p>
      </div>
    </div>
  `,
  styleUrls: ['./confirm-email.component.scss']
})
export class ConfirmEmailComponent implements OnInit {
  errorMessage: string | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private notificationsService: NotificationsService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const userId = params['userId'];
      const code = params['code'];

      if (userId && code) {
        this.authService.confirmEmail(userId, code).subscribe({
          next: (response) => {
            const status = response.success ? 'sucesso' : 'erro';
            const mensagem = response.message || (response.notifications && response.notifications[0].mensagem) || 'Mensagem não disponível.';
            this.router.navigate(['/resposta-confirmacao'], { queryParams: { status: status, mensagem: mensagem } });
          },
          error: (err) => {
            this.errorMessage = 'Erro ao se conectar com o servidor. Tente novamente mais tarde.';
            this.notificationsService.showNotification(this.errorMessage, 'erro');
            this.router.navigate(['/resposta-confirmacao'], { queryParams: { status: 'erro', mensagem: this.errorMessage } });
          }
        });
      } else {
        this.errorMessage = 'Parâmetros de confirmação inválidos.';
        this.notificationsService.showNotification(this.errorMessage, 'erro');
        this.router.navigate(['/resposta-confirmacao'], { queryParams: { status: 'erro', mensagem: this.errorMessage } });
      }
    });
  }
}