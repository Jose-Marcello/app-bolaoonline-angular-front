import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { environment } from '@environments/environment';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { NotificationsService } from '@services/notifications.service'; 
import { FormsModule } from '@angular/forms'; 

@Component({
  selector: 'app-mock-email',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule 
  ],
  templateUrl: './mock-email.component.html',
  styleUrls: ['./mock-email.component.scss']
})
export class MockEmailComponent implements OnInit {
  emailData: any;
  isLoading = true; 
  
  // Variáveis para a lógica condicional no HTML:
  isResetFlow = false; // true se vier do "Esqueceu a Senha"
  resetLink: string | null = null; // Link de token para Redefinir Senha
  confirmationLink: string | null = null; // Link de token para Confirmação (Registro)


  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private notificationsService: NotificationsService 
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const email = params['email'];
      const type = params['type']; // 'reset' ou 'confirmation'
      const link = params['link'];
      
      // 1. Lógica de Diferenciação de Fluxo
      this.isResetFlow = type === 'reset'; 
      
      // 2. Captura dos Links/Tokens
      this.resetLink = link || null; 
      
      // Se tiver o e-mail, buscar o corpo do mock
      if (email) {
        this.fetchMockEmail(email); 
      } else {
        this.isLoading = false;
        this.notificationsService.showNotification('Erro: E-mail não fornecido para simulação.', 'erro');
      }
    });
  }

  // MÉTODO CORRIGIDO: Alterado de GET para POST
  fetchMockEmail(email: string) {
    // 1. A URL base é usada, sem o query parameter do email
    const url = `${environment.apiUrl}/api/testes/emails`;
    
    // 2. O Body da requisição (JSON que será enviado)
    const body = { email: email };
    
    // Altera this.http.get para this.http.post e envia o body
    this.http.post<any>(url, body).pipe(finalize(() => this.isLoading = false)).subscribe(
      (response) => {
        const emails = response && response.$values ? response.$values : [];
        if (emails.length > 0) {
          this.emailData = emails[emails.length - 1];
          
          if (!this.isResetFlow && this.emailData.body) {
              this.confirmationLink = this.emailData.confirmationLink || 'MOCK_CONFIRM_LINK'; 
          }
          
        } else {
          this.notificationsService.showNotification('Nenhum e-mail simulado encontrado para este endereço.', 'alerta');
          this.emailData = null;
        }
      },
      (error: HttpErrorResponse) => {
        console.error('Erro ao buscar e-mail simulado:', error);
        // Esta notificação deve parar de aparecer quando o 405 for resolvido
        this.notificationsService.showNotification('Erro ao conectar com o serviço de mock.', 'erro');
        this.emailData = null;
      }
    );
  }

  // Ação de CONFIRMAR E-MAIL (Fluxo de Registro)
  onConfirm() {
    if (!this.confirmationLink) return;

    // Lógica para POSTAR no endpoint de confirmação real
    this.notificationsService.showNotification('Simulação: Confirmando e-mail...', 'sucesso');
    // Implementar a chamada this.http.post para o endpoint real e redirecionar
    this.router.navigate(['/resposta-confirmacao'], { 
        queryParams: { status: 'sucesso', message: 'Simulação: E-mail confirmado com sucesso!' }
    });
  }

  // Ação de VOLTAR/CANCELAR
  onCancel(): void {
    this.router.navigate(['/login']);
    this.notificationsService.showNotification('Simulação de e-mail cancelada. Retornando ao login.', 'alerta');
  }
}