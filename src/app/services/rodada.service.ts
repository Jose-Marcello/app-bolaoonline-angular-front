// Localização: src/app/services/rodada.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ApiResponse, PreservedCollection } from '@models/common/api-response.model';
import { RodadaDto } from '@models/rodada/rodada-dto.model';
import { ConferenciaPalpiteDto } from '@models/relatorios/conferencia-palpite-dto.model';
import { JogoDto } from '@models/jogo/jogo-dto.model'; // Importar JogoDto

@Injectable({
  providedIn: 'root'
})
export class RodadaService {
  // <<-- CORRIGIDO AQUI: Adicionado '/' entre environment.apiUrl e 'api/Rodada' -->>
  private apiUrlRodada = `${environment.apiUrl}/api/Rodada`; 

  //private apiUrl = `${environment.apiUrl}/rodada`;

  constructor(private http: HttpClient) { }

  


  /**
   * Obtém todas as rodadas em aposta para um campeonato específico.
   * @param campeonatoId O ID do campeonato.
   * @returns Um Observable com a resposta da API contendo as rodadas em aposta.
   */
  getRodadasEmAposta(campeonatoId: string): Observable<ApiResponse<PreservedCollection<RodadaDto>>> {
    const url = `${this.apiUrlRodada}/ListarEmApostas/${campeonatoId}`;
    console.log('[RodadaService] Chamando getRodadasEmAposta com URL:', url);
    return this.http.get<ApiResponse<PreservedCollection<RodadaDto>>>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtém todas as rodadas correntes para um campeonato específico.
   * @param campeonatoId O ID do campeonato.
   * @returns Um Observable com a resposta da API contendo as rodadas correntes.
   */
  getRodadasCorrentes(campeonatoId: string): Observable<ApiResponse<PreservedCollection<RodadaDto>>> {
    const url = `${this.apiUrlRodada}/ListarCorrentes/${campeonatoId}`;
    console.log('[RodadaService] Chamando getRodadasCorrentes com URL:', url);
    return this.http.get<ApiResponse<PreservedCollection<RodadaDto>>>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtém todas as rodadas finalizadas para um campeonato específico.
   * @param campeonatoId O ID do campeonato.
   * @returns Um Observable com a resposta da API contendo as rodadas finalizadas.
   */
  getRodadasFinalizadas(campeonatoId: string): Observable<ApiResponse<PreservedCollection<RodadaDto>>> {
    const url = `${this.apiUrlRodada}/ListarFinalizadas/${campeonatoId}`;
    console.log('[RodadaService] Chamando getRodadasFinalizadas com URL:', url);
    return this.http.get<ApiResponse<PreservedCollection<RodadaDto>>>(url)
      .pipe(
        catchError(this.handleError)
      );
  }


obterDadosPlanilhaConferencia(rodadaId: string): Observable<PreservedCollection<ConferenciaPalpiteDto>> {
  return this.http.get<PreservedCollection<ConferenciaPalpiteDto>>(`${this.apiUrlRodada}/conferencia/${rodadaId}`);
}

  /**
   * Obtém todos os jogos de uma rodada específica.
   * Este método é usado para carregar os jogos para uma NOVA aposta.
   * @param rodadaId O ID da rodada.
   * @returns Um Observable com a resposta da API contendo uma coleção de JogoDto.
   */
  
  getJogosPorRodada(rodadaId: string): Observable<ApiResponse<PreservedCollection<JogoDto>>> {
    const url = `${this.apiUrlRodada}/ListarJogosPorRodada/${rodadaId}`;
    console.log('[RodadaService] Chamando getJogosPorRodada com URL:', url);
    return this.http.get<ApiResponse<PreservedCollection<JogoDto>>>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Manipulador de erros HTTP genérico para o RodadaService.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('[RodadaService] Erro na requisição HTTP:', error);
    let errorMessage = 'Ocorreu um erro desconhecido ao buscar dados da rodada.';
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
