// Localização: src/app/core/services/apostador-campeonato.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ApiResponse, PreservedCollection } from '@models/common/api-response.model';
import { ApostadorCampeonatoDto } from '@models/apostador-campeonato/apostador-campeonato-dto.model';

@Injectable({
  providedIn: 'root'
})
export class ApostadorCampeonatoService {
  
  private apiUrlApostadorCampeonato = `${environment.apiUrl}/api/ApostadorCampeonato`;
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Obtém a associação ApostadorCampeonato para um usuário e campeonato específicos.
   * @param usuarioId O ID do usuário.
   * @param campeonatoId O ID do campeonato.
   * @returns Um Observable com a resposta da API contendo o ApostadorCampeonatoDto.
   */
  getApostadorCampeonatoPorUsuarioECampeonato(usuarioId: string, campeonatoId: string): Observable<ApiResponse<PreservedCollection<ApostadorCampeonatoDto>>> {
    const url = `${this.apiUrlApostadorCampeonato}/ObterPorUsuarioECampeonato?usuarioId=${usuarioId}&campeonatoId=${campeonatoId}`;
    console.log('[ApostadorCampeonatoService] Chamando getApostadorCampeonatoPorUsuarioECampeonato com URL:', url);
    return this.http.get<ApiResponse<PreservedCollection<ApostadorCampeonatoDto>>>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Realiza a adesão de um usuário a um campeonato.
   * @param apostadorId O ID do APOSTADOR referente ao usuário logado.
   * @param campeonatoId O ID do campeonato ao qual o usuário deseja aderir.
   * @returns Um Observable com a resposta da API.
   */
  aderirCampeonato( apostadorId: string, campeonatoId: string): Observable<ApiResponse<ApostadorCampeonatoDto>> {
    //const request = { usuarioId, campeonatoId };
    const url = `${this.apiUrl}/api/Apostador/AderirCampeonato`;  // Corrigido para a rota correta do ApostadorController
    //const url = `${this.apiUrlApostador}/Aderir`;
    const requestBody = { apostadorId, campeonatoId }; // DTO simples para a requisição
    console.log('[ApostadorCampeonatoService] Chamando aderirCampeonato com URL:', url, 'e Request:', requestBody);
    return this.http.post<ApiResponse<ApostadorCampeonatoDto>>(url, requestBody)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Manipulador de erros HTTP genérico para o ApostadorCampeonatoService.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('[ApostadorCampeonatoService] Erro na requisição HTTP:', error);
    let errorMessage = 'Ocorreu um erro desconhecido ao processar a adesão ao campeonato.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erro do cliente: ${error.error.message}`;
    } else {
      if (error.status === 404) {
        errorMessage = 'Recurso não encontrado.';
      } else if (error.status === 401) {
        errorMessage = 'Não autorizado. Faça login novamente.';
      } else if (error.status === 403) {
        errorMessage = 'Acesso negado. Você não tem permissão para esta ação.';
      } else if (error.error && error.error.message) {
        errorMessage = `Erro do servidor: ${error.error.message}`;
      } else if (error.message) {
        errorMessage = `Erro: ${error.message}`;
      } else {
        errorMessage = `Erro do servidor (Status: ${error.status}): ${error.statusText || ''}`;
      }
    }
    return throwError(() => new Error(errorMessage));
  }
}
