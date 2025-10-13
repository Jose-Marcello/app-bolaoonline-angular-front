// Localização: src/app/core/services/campeonato.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http'; // Importar HttpErrorResponse
import { Observable, throwError } from 'rxjs'; // Importar throwError
import { catchError, map } from 'rxjs/operators';
import { environment } from '@environments/environment';

import { CampeonatoDto } from '@models/campeonato/campeonato-dto.model';
import { ApiResponse } from '@models/common/api-response.model';
import { VincularApostadorCampeonatoDto } from '@models/campeonato/vincular-apostador-campeonato.model';
// import { BaseService } from '@core/services/base.service'; // <<-- REMOVIDO -->>

@Injectable({
  providedIn: 'root'
})
export class CampeonatoService { // <<-- REMOVIDO extends BaseService -->>

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    // super(); // <<-- REMOVIDO -->>
  }

  /**
   * Obtém a lista de campeonatos disponíveis, incluindo o status de adesão do usuário.
   * @param userId O ID do usuário logado para verificar a adesão.
   * @returns Um Observable da ApiResponse contendo um array de CampeonatoDto.
   */
  getAvailableCampeonatos(userId: string): Observable<ApiResponse<CampeonatoDto[]>> {
    console.log(`[CampeonatoService] getAvailableCampeonatos: Chamando API para userId: ${userId}`);
    let params = new HttpParams().set('userId', userId); // Adiciona userId como query parameter
    return this.http.get<ApiResponse<CampeonatoDto[]>>(`${this.apiUrl}/api/Campeonato/Available`, { params }).pipe(
      map(response => {
        console.log('[CampeonatoService] Resposta da API getAvailableCampeonatos:', response);
        return response;
      }),
      catchError(this.handleError) // Reutiliza o manipulador de erros
    );
  }

  /**
   * Tenta vincular um apostador a um campeonato.
   * @param request Dados para vincular apostador ao campeonato.
   * @returns Um Observable da ApiResponse.
   */
  entrarEmCampeonato(request: VincularApostadorCampeonatoDto): Observable<ApiResponse<any>> {
    console.log('[CampeonatoService] entrarEmCampeonato: Chamando API para vincular apostador ao campeonato.');
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/api/Campeonato/VincularApostador`, request).pipe(
      map(response => {
        console.log('[CampeonatoService] Resposta da API entrarEmCampeonato:', response);
        return response;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Manipulador de erros HTTP genérico.
   * <<-- ADICIONADO ESTE MÉTODO -->>
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('[CampeonatoService] Erro na requisição HTTP:', error);
    let errorMessage = 'Ocorreu um erro desconhecido.';
    if (error.error instanceof ErrorEvent) {
      // Erro do lado do cliente ou de rede
      errorMessage = `Erro: ${error.error.message}`;
    } else {
      // Erro do lado do servidor
      if (error.status === 401) {
        errorMessage = 'Não autorizado. Por favor, faça login novamente.';
      } else if (error.status === 403) {
        errorMessage = 'Acesso negado. Você não tem permissão para esta ação.';
      } else if (error.error && error.error.message) {
        // Tenta pegar a mensagem de erro do corpo da resposta, se disponível
        errorMessage = `Erro do servidor: ${error.error.message}`;
      } else if (error.message) {
        errorMessage = `Erro: ${error.message}`;
      } else {
        errorMessage = `Erro do servidor (Status: ${error.status}): ${error.statusText || ''}`;
      }
    }
    // Retorna um Observable com o erro para que o componente possa tratá-lo
    return throwError(() => new Error(errorMessage));
  }
}
