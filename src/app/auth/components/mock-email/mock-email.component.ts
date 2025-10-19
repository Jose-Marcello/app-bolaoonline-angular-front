// Localização: src/app/auth/components/mock-email/mock-email.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '@environments/environment';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { NotificationsService } from '@services/notifications.service'; 


@Component({
  selector: 'app-mock-email',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,

  ],
  templateUrl: './mock-email.component.html',
  styleUrls: ['./mock-email.component.scss']
})
export class MockEmailComponent implements OnInit {
  emailData: any;
  isLoading = true;  
  isResetFlow = false; // Novo: Determina se o fluxo é de Redefinição de Senha
  resetLink: string | null = null; // Novo: Armazena o token/link para o botão Redefinir
  confirmationLink: string | null = null; // Novo: Armazena o link para o botão Confirmar

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private notificationsService: NotificationsService 

  ) { }

  ngOnInit(): void {
  // O componente precisa garantir que ActivatedRoute (this.route) esteja no construtor
  this.route.queryParams.subscribe(params => {
    
    const email = params['email'];
    const type = params['type']; // 'reset' ou 'confirmation'
    const link = params['link'];  // O token/link de reset, se existir

    // 1. Lógica de Diferenciação de Fluxo
    // Esta variável DEVE estar declarada na classe: isResetFlow: boolean = false;
    this.isResetFlow = type === 'reset'; 

    // 2. Captura dos Dados Críticos para os Botões
    // Esta variável DEVE estar declarada na classe: resetLink: string | null = null;
    this.resetLink = link || null; 

    // 3. Execução do Mock
    if (email) {
      this.fetchMockEmail(email); // Sua função para buscar o corpo do email
    } else {
      this.isLoading = false;
      // Opcional: Notificar que o e-mail não foi fornecido
    }
  });
}

 onCancel(): void {
    // Simplesmente redireciona o usuário para a tela de login
    this.router.navigate(['/login']);
    this.notificationsService.showNotification('Simulação de e-mail cancelada. Retornando ao login.', 'alerta');
  }
 

  fetchMockEmail(email: string) {
    const url = `${environment.apiUrl}/api/testes/emails?email=${email}`;
    
    this.http.get<any>(url).subscribe(
      (response) => {
        const emails = response && response.$values ? response.$values : [];
        if (emails.length > 0) {
          this.emailData = emails[emails.length - 1];
        } else {
          this.emailData = null;
        }
        this.isLoading = false;
      },
      (error) => {
        console.error('Erro ao buscar e-mail simulado:', error);
        this.isLoading = false;
        this.emailData = null;
      }
    );
  }

  onConfirm() {
  const confirmationLink = this.emailData?.confirmationLink;
  if (confirmationLink) {
    this.isLoading = true;
    console.log('Iniciando a confirmação via API:', confirmationLink);

    // Extrai os parâmetros da URL
    const url = new URL(confirmationLink);
    const userId = url.searchParams.get('userId');
    const code = url.searchParams.get('code');

    // Monta o corpo da requisição POST
    const body = { userId, code };

    // Faça uma chamada HTTP POST para o endpoint
    // Substitua a URL base pela sua API real
    const postUrl = 'http://localhost:5288/api/account/ConfirmEmail';

    this.http.post<any>(postUrl, body).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (response) => {
        console.log('Resposta da confirmação:', response);
        this.router.navigate(['/resposta-confirmacao'], {
          queryParams: { status: 'sucesso', message: 'Seu e-mail foi confirmado com sucesso!' }
        });
      },
      error: (error) => {
        console.error('Falha na confirmação do e-mail:', error);
        this.router.navigate(['/resposta-confirmacao'], {
          queryParams: { status: 'erro', message: 'Falha ao confirmar seu e-mail. O link pode estar inválido ou expirado.' }
        });
      }
    });
 
 
  }
 
 }

}


