import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError,tap } from 'rxjs/operators';
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
  // Ajuste as URLs para apontarem sempre para o controlador de ApostaRodada
  private apiUrl = `${environment.apiUrl}/api/ApostaRodada`;
  private apiUrlCampeonato = `${environment.apiUrl}/api/Campeonato`;

  constructor(private http: HttpClient) { }

  // CORREÇÃO DO SALVAR: Use a apiUrl correta (ApostaRodada)  
  // No aposta.service.ts
   salvarApostas(apostaRequest: SalvarApostaRequestDto): Observable<ApiResponse<any>> {
  
      // Tente forçar a URL relativa se estiver no mesmo domínio
      const url = `${this.apiUrl}/SalvarApostas`.replace(/([^:]\/)\/+/g, "$1"); 
    
      return this.http.post<ApiResponse<any>>(url, apostaRequest)
        .pipe(
          tap(res => console.log('Resposta do Servidor:', res)),
          catchError(this.handleError)
        );
   }

  // CORREÇÃO DO GET BY ID (Para a seleção de outras apostas)
  getApostaById(id: string): Observable<any> {
    // Se o 404 persistir, verifique se o backend não exige uma rota como '/ObterPorId/'
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /*
getApostasPorRodadaEApostadorCampeonato(rodadaId: string, apostadorCampeonatoId: string | null): Observable<ApiResponse<ApostaRodadaDto[]>> {
  let params = new HttpParams().set('rodadaId', rodadaId);
  
  // Se for o Jeff, o apostadorCampeonatoId é null e não será enviado no Params.
  // O backend deve estar preparado para receber null e buscar pelo ApostadorId do Token.
  if (apostadorCampeonatoId) {
    params = params.set('apostadorCampeonatoId', apostadorCampeonatoId);
  }

  return this.http.get<ApiResponse<ApostaRodadaDto[]>>(`${this.apiUrl}/ListarPorRodadaEApostadorCampeonato`, { params })
    .pipe(catchError(this.handleError));
}
*/

obterApostasPorRodada(rodadaId: string, apostadorCampeonatoId?: string): Observable<ApiResponse<ApostaRodadaDto[]>> {
  let params = new HttpParams().set('rodadaId', rodadaId);
  
  // Se existir ID de campeonato, envia. Se for avulsa (null), não envia.
  if (apostadorCampeonatoId) {
    params = params.set('apostadorCampeonatoId', apostadorCampeonatoId);
  }

  // Use EXATAMENTE o nome da rota que está no seu Controller C#
  return this.http.get<ApiResponse<ApostaRodadaDto[]>>(
    `${this.apiUrl}/ListarPorRodadaEApostadorCampeonato`, 
    { params }
  ).pipe(catchError(this.handleError));
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


 criarNovaApostaAvulsa(requestBody: any): Observable<ApiResponse<ApostaRodadaDto>> {
    const url = `${this.apiUrl}/CriarApostaAvulsa`;
    
    // 1. Mantemos sua extração inteligente para o RodadaId
    const rodadaIdFinal = typeof requestBody === 'string' 
        ? requestBody 
        : (requestBody.rodadaId || requestBody.RodadaId || requestBody.id);

    // 2. 🚀 A NOVIDADE: Extraímos também o ApostadorId que você passou a exigir
    const apostadorIdFinal = requestBody.apostadorId || requestBody.ApostadorId || requestBody.userId;

    // 3. Montamos o Payload com os nomes que o C# (Azure) exige (PascalCase)
    const payload = { 
        RodadaId: rodadaIdFinal,
        ApostadorId: apostadorIdFinal, // <--- Aqui está o segredo do sucesso
        CustoAposta: requestBody.custoAposta || 10,
        CampeonatoId: requestBody.campeonatoId || null
    };

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    // Esse log vai mostrar se o ApostadorId está indo ou não!
    console.log('[ApostaService] PAYLOAD FINAL PARA AZURE:', JSON.stringify(payload));

    return this.http.post<ApiResponse<ApostaRodadaDto>>(url, payload, { headers }).pipe(
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
    // Ajuste a URL para bater no Controller de Campeonato, conforme combinamos
    return this.http.get<ApiResponse<ApostasCampeonatoTotaisDto>>(
    `${this.apiUrl}/campeonatos/${campeonatoId}/totais`
    );
  }


  // Altere o método para receber os dois IDs necessários
  obterJogosComPalpites(apostaId: string, rodadaId: string): Observable<ApiResponse<any>> {
    // A URL deve refletir a nova rota do Controller
    const url = `${this.apiUrl}/ObterJogosComPalpites/${apostaId}/${rodadaId}`;
  
    return this.http.get<ApiResponse<any>>(url).pipe(
    catchError(this.handleError)

  );
}
  
/**
   * MÉTODO 1: Busca todas as rodadas de um campeonato para montar o seletor (1, 2, 3...)
   *
   */
  getRodadasByCampeonato(campeonatoId: string): Observable<ApiResponse<any[]>> {
    // Ajuste a rota conforme seu Controller de Rodada/Campeonato no C#
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/Rodada/ListarPorCampeonato/${campeonatoId}`);
  }

  /**
   * MÉTODO 2: Busca os resultados reais e os palpites do apostador (O Grid de Apostas/Fachada)
   *
   */
  getResultadosRodada(campeonatoId: string, rodadaId: string): Observable<ApiResponse<ApostaRodadaResultadosDto>> {
    // Esta rota deve bater com o erro 404 que vimos no seu console
    // Verifique se o seu Controller espera esses nomes de parâmetros
    return this.http.get<ApiResponse<ApostaRodadaResultadosDto>>(
      `${this.apiUrl}/Resultados?campeonatoId=${campeonatoId}&rodadaId=${rodadaId}`
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('[ApostaService] Erro na requisição HTTP:', error);
    return throwError(() => error);
  }

}