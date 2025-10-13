import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@environments/environment';

import { ApiResponse } from '@models/common/api-response.model';
import { ApostadorDto } from '@models/apostador/apostador-dto.model';
import { UpdatePerfilRequestDto } from '@models/apostador/update-perfil-request.model'; // Importação do novo DTO

@Injectable({
  providedIn: 'root'
})
export class ApostadorService {
  private apiUrl = `${environment.apiUrl}/api/Apostador`;

  constructor(private http: HttpClient) { }

  getDadosApostador(): Observable<ApiResponse<ApostadorDto>> {
    const url = `${this.apiUrl}/Dados`;
    return this.http.get<ApiResponse<ApostadorDto>>(url).pipe(
      catchError(this.handleError)
    );
  }

  getPontuacaoTotalDoApostador(campeonatoId: string, apostadorId: string): Observable<ApiResponse<number>> {
    const url = `${environment.apiUrl}/api/ApostadorCampeonato/GetPontuacaoTotalDoApostador?campeonatoId=${campeonatoId}&apostadorId=${apostadorId}`;
    return this.http.get<ApiResponse<number>>(url).pipe(
      catchError(this.handleError)
    );
  }

  // Método de atualização ajustado para o novo endpoint PUT
  atualizarPerfil(perfilData: UpdatePerfilRequestDto): Observable<ApiResponse<any>> {
    const url = `${this.apiUrl}/AtualizarPerfil`; // Usando o novo endpoint PUT
    
    // O backend agora espera um objeto JSON com os dados do perfil, incluindo a URL da foto.
    return this.http.put<ApiResponse<any>>(url, perfilData).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('[ApostadorService] Erro na requisição HTTP:', error);
    let errorMessage = 'Ocorreu um erro desconhecido.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erro do cliente: ${error.error.message}`;
    } else {
      errorMessage = `Erro no servidor: ${error.status} - ${error.statusText || ''}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}