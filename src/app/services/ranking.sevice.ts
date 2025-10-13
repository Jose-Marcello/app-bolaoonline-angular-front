// src/app/services/ranking/ranking.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators'; // Garanta que 'map' está aqui
import { environment } from '@environments/environment';

import { ApiResponse } from '@models/common/api-response.model';
import { RankingDto } from '@models/ranking/ranking-dto.model';

@Injectable({
  providedIn: 'root'
})
export class RankingService {

  private apiUrl = `${environment.apiUrl}/api/Ranking`;

  constructor(private http: HttpClient) { }

  /**
   * Obtém o ranking da rodada.
   * @param rodadaId O ID da rodada.
   */
  getRankingRodada(rodadaId: string): Observable<ApiResponse<RankingDto[]>> {
    const url = `${this.apiUrl}/rodada/${rodadaId}`;
    return this.http.get<ApiResponse<RankingDto[]>>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtém o ranking geral do campeonato.
   * @param campeonatoId O ID do campeonato.
   */
  getRankingCampeonato(campeonatoId: string): Observable<ApiResponse<RankingDto[]>> {
    const url = `${this.apiUrl}/campeonato/${campeonatoId}`;
    return this.http.get<ApiResponse<RankingDto[]>>(url).pipe(
      // Este 'map' é a solução para o problema de tipo 'PreservedCollection'
      map(response => response), 
      catchError(this.handleError)
    );
  }

  /**
   * Manipula erros de requisição HTTP.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('[RankingService] Erro na requisição HTTP:', error);
    let errorMessage = 'Ocorreu um erro desconhecido.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erro do cliente: ${error.error.message}`;
    } else {
      errorMessage = `Erro no servidor: ${error.status} - ${error.statusText || ''}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}