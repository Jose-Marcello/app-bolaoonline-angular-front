import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@environments/environment';

import { ApiResponse } from '@models/common/api-response.model';
import { ApostaRodadaDto } from '@models/aposta/aposta-rodada-dto.model';
import { ApostaJogoEdicaoDto } from '@models/aposta/aposta-jogo-edicao-dto.model';
import { ApostaJogoResultadoDto } from '@models/aposta/aposta-jogo-resultado-dto.model';
import { ApostaRodadaResultadosDto } from '@models/aposta/aposta-rodada-resultados-dto.model'; 
import { SalvarApostaRequestDto } from '@models/aposta/salvar-aposta-request-dto.model';
import { CriarApostaAvulsaRequestDto } from '@models/aposta/criar-aposta-avulsa-request.Dto.model';
import { ApostasAvulsasTotaisDto } from '@models/aposta/apostas-avulsas-totais-dto.model'; 
import { ApostasCampeonatoTotaisDto } from '@models/campeonato/apostas-campeonato-totais-dto.model'; // <-- NOVO DTO


@Injectable({
  providedIn: 'root'
})
export class ApostaService {
  private apiUrl = `${environment.apiUrl}/api/ApostaRodada`;
  private apiUrlSalvarApostas = `${environment.apiUrl}/api/ApostadorCampeonato`;
  private apiUrlCampeonato = `${environment.apiUrl}/api/Campeonato`;

  constructor(private http: HttpClient) { }

  getApostasPorRodadaEApostadorCampeonato(rodadaId: string, apostadorCampeonatoId: string | null): Observable<ApiResponse<ApostaRodadaDto[]>> {
    let params = new HttpParams().set('rodadaId', rodadaId);
    if (apostadorCampeonatoId) {
      params = params.set('apostadorCampeonatoId', apostadorCampeonatoId);
    }

    console.log('[ApostaService] Chamando ListarPorRodadaEApostadorCampeonato com URL:', `${this.apiUrl}/ListarPorRodadaEApostadorCampeonato`, 'e params:', params.toString());

    return this.http.get<ApiResponse<ApostaRodadaDto[]>>(`${this.apiUrl}/ListarPorRodadaEApostadorCampeonato`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  getApostasParaEdicao(rodadaId: string, apostaRodadaId: string): Observable<ApiResponse<ApostaJogoEdicaoDto[]>> {
    const url = `${environment.apiUrl}/api/ApostaRodada/ParaEdicao`;
    const params = new HttpParams()
      .set('rodadaId', rodadaId)
      .set('apostaRodadaId', apostaRodadaId);

    console.log(`[ApostaService] Chamando getApostasParaEdicao com URL: ${url} e params: ${params.toString()}`);
    return this.http.get<ApiResponse<ApostaJogoEdicaoDto[]>>(url, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * CORREÇÃO FINAL: Assinatura do método e parâmetros corrigidos.
   * Agora o método retorna o DTO de resultados completo, conforme o backend.
   * A extração dos jogos será feita no componente.
   */
  getApostasComResultados(rodadaId: string, apostaRodadaId: string): Observable<ApiResponse<ApostaRodadaResultadosDto>> {
    if (!rodadaId || !apostaRodadaId) {
      return throwError(() => new Error('IDs de rodada ou aposta não podem ser nulos.'));
    }

    const params = new HttpParams()
      .set('rodadaId', rodadaId)
      .set('apostaRodadaId', apostaRodadaId);

    console.log('[ApostaService] Chamando getApostasComResultados com URL:', `${this.apiUrl}/Resultados`, 'e params:', params.toString());

    return this.http.get<ApiResponse<ApostaRodadaResultadosDto>>(`${this.apiUrl}/Resultados`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  salvarApostas(apostaRequest: SalvarApostaRequestDto): Observable<ApiResponse<any>> {
    console.log('[ApostaService] Chamando salvarApostas com URL:', `${this.apiUrlSalvarApostas}/SalvarApostas`);
    return this.http.post<ApiResponse<any>>(`${this.apiUrlSalvarApostas}/SalvarApostas`, apostaRequest)
      .pipe(
        catchError(this.handleError)
      );
  }

  criarNovaApostaAvulsa(requestBody: CriarApostaAvulsaRequestDto): Observable<ApiResponse<ApostaRodadaDto>> {
    console.log('[ApostaService] Chamando CriarNovaApostaAvulsa com URL:', `${this.apiUrl}/CriarApostaAvulsa`, 'e dados:', requestBody);
    return this.http.post<ApiResponse<ApostaRodadaDto>>(`${this.apiUrl}/CriarApostaAvulsa`, requestBody)
      .pipe(
        catchError(this.handleError)
      );
  }

// Seu novo método vai ser adicionado aqui
  /**
   * Obtém os totais de apostas avulsas (isoladas) de uma rodada específica.
   * @param rodadaId O ID da rodada em aposta.
   * @returns Um Observable com o DTO contendo o número e o valor total de apostas avulsas.
   */
  obterTotaisApostasAvulsas(rodadaId: string): Observable<ApiResponse<ApostasAvulsasTotaisDto>> {
    const params = new HttpParams().set('rodadaId', rodadaId);
    
    console.log('[ApostaService] Chamando obterTotaisApostasAvulsas com URL:', `${this.apiUrl}/totais-apostas-avulsas`, 'e params:', params.toString());
    
    return this.http.get<ApiResponse<ApostasAvulsasTotaisDto>>(`${this.apiUrl}/totais-apostas-avulsas`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

 /**
   * Obtém os totais de arrecadação de um campeonato.
   * @param campeonatoId O ID do campeonato.
   * @returns Um Observable com o DTO de totais do campeonato.
   */
  obterTotaisCampeonato(campeonatoId: string): Observable<ApiResponse<ApostasCampeonatoTotaisDto>> {
    return this.http.get<ApiResponse<ApostasCampeonatoTotaisDto>>(`${this.apiUrl}/totais-campeonato/${campeonatoId}`)
      .pipe(
        catchError(this.handleError)
      );
  }



  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('[ApostaService] Erro na requisição HTTP:', error);
    return throwError(() => error);
  }
}