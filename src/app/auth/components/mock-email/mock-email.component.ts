// Localização: src/app/auth/components/mock-email/mock-email.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '@environments/environment';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';

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

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const email = params['email'];
      if (email) {
        this.fetchMockEmail(email);
      } else {
        this.isLoading = false;
      }
    });
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


