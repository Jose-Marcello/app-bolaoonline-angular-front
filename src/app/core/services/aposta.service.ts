import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

import { ApiResponse } from '../../shared/models/api-response.model';
import { ApostaRodadaDto } from '../../features/aposta-rodada/models/aposta-rodada-dto.model';
import { ApostaJogoEdicaoDto } from '../../features/aposta-rodada/models/aposta-jogo-edicao-dto.model';
import { ApostaJogoResultadoDto } from '../../features/aposta-rodada/models/aposta-jogo-resultado-dto.model';
import { ApostaRodadaResultadosDto } from '../../features/aposta-rodada/models/aposta-rodada-resultados-dto.model'; 
import { SalvarApostaRequestDto } from '../../features/aposta-rodada/models/salvar-aposta-request-dto.model';
import { CriarApostaAvulsaRequestDto } from '../../features/aposta-rodada/models/criar-aposta-avulsa-request.Dto.model';
import { ApostasAvulsasTotaisDto } from '../../features/aposta-rodada/models/apostas-avulsas-totais-dto.model'; 
import { ApostasCampeonatoTotaisDto } from '../../features/campeonato/models/apostas-campeonato-totais-dto.model'; // <-- NOVO DTO


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
    // Tente remover o sufixo '/SalvarApostas' se o seu Swagger indicar que o POST é na raiz
    const url = `${this.apiUrlSalvarApostas}`; 
    console.log('[ApostaService] Chamando salvarApostas com URL:', url);
    
    return this.http.post<ApiResponse<any>>(url, apostaRequest)
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

 // 1. O GET precisa do ID na rota
 getApostaById(id: string): Observable<any> {
  // Verifique se o seu backend exige '/api/ApostaRodada/' + id
  // ou se há um método intermediário como '/api/ApostaRodada/obter/' + id
  return this.http.get<any>(`${this.apiUrl}/${id}`);
 }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('[ApostaService] Erro na requisição HTTP:', error);
    return throwError(() => error);
  }

}