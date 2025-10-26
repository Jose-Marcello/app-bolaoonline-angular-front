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
  
  isResetFlow = false; 
  resetLink: string | null = null; 
  confirmationLink: string | null = null; 


  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private notificationsService: NotificationsService 
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const email = params['email'];
      const type = params['type'];
      const link = params['link'];
      
      this.isResetFlow = type === 'reset'; 
      this.resetLink = link || null; 
      
      if (email) {
        this.fetchMockEmail(email); 
      } else {
        this.isLoading = false;
        this.notificationsService.showNotification('Erro: E-mail não fornecido para simulação.', 'erro');
      }
    });
  }

  // 💥 CORREÇÃO FINAL: Revertendo para GET e enviando o email na URL para sincronizar com o Backend [HttpGet("emails")]
  fetchMockEmail(email: string) {
    // 1. A URL DEVE incluir o email como Query Parameter
    const url = `${environment.apiUrl}/api/testes/emails?email=${email}`;
    
    // 2. O método DEVE ser GET
    this.http.get<any>(url).pipe(finalize(() => this.isLoading = false)).subscribe(
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
        this.notificationsService.showNotification('Erro ao conectar com o serviço de mock.', 'erro');
        this.emailData = null;
      }
    );
  }

  onConfirm() {
    if (!this.confirmationLink) return;
    this.notificationsService.showNotification('Simulação: Confirmando e-mail...', 'sucesso');
    this.router.navigate(['/resposta-confirmacao'], { 
        queryParams: { status: 'sucesso', message: 'Simulação: E-mail confirmado com sucesso!' }
    });
  }

  onCancel(): void {
    this.router.navigate(['/login']);
    this.notificationsService.showNotification('Simulação de e-mail cancelada. Retornando ao login.', 'alerta');
  }
}