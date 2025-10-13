import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@environments/environment';

import { ApiResponse } from '@models/common/api-response.model';
import { DepositarRequestDto } from '@models/financeiro/depositar-request-dto.model';

@Injectable({
  providedIn: 'root'
})
export class FinanceiroService {
  // Mantenha a apiUrl como a base principal do seu backend
  private apiUrl = environment.apiUrl; 

  constructor(private http: HttpClient) { }

  /**
   * Envia uma requisição de depósito para a API do backend.
   * @param request O DTO de requisição contendo o ID do apostador e o valor.
   * @returns Um Observable com a resposta da API.
   */
  depositar(request: DepositarRequestDto): Observable<ApiResponse<any>> {
    console.log('[FinanceiroService] Chamando o endpoint de depósito com dados:', request);
    // Corrija a URL para o endpoint completo da sua API
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/api/TransacaoFinanceira/Depositar`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Simula o acionamento de um webhook de pagamento.
   * Envia a referência externa e o valor para o backend para que ele credite o saldo.
   * @param externalReference A chave de referência única da transação (a "chave PIX").
   * @param valor O valor da transação a ser creditado.
   * @returns Um Observable com a resposta da API.
   */
  simularWebhook(externalReference: string, valor: number): Observable<ApiResponse<any>> {
    const request = { externalReference, valor };
    console.log('[FinanceiroService] Chamando endpoint de simulação de webhook com:', request);
    
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/api/TransacaoFinanceira/SimularWebhookPix`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('[FinanceiroService] Erro na requisição HTTP:', error);
    return throwError(() => error);
  }
}
