// Localização: src/app/services/file-upload.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '@environments/environment';

// Assumindo que seu backend tem um endpoint de upload que retorna uma URL
// Exemplo: POST /api/Upload/Image
interface UploadResponse {
  success: boolean;
  message: string;
  url: string; // O backend deve retornar a URL da imagem salva
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private apiUrl = `${environment.apiUrl}/api/Upload`; // Exemplo de endpoint de upload

  constructor(private http: HttpClient) { }

  uploadFile(file: File): Observable<string> {
    if (!file) {
      return throwError(() => new Error('Nenhum arquivo selecionado.'));
    }

    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<UploadResponse>(`${this.apiUrl}/Image`, formData).pipe(
      map(response => {
        if (response.success && response.url) {
          return response.url;
        } else {
          throw new Error(response.message || 'Erro desconhecido no upload.');
        }
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('[FileUploadService] Erro no upload:', error);
    let errorMessage = 'Ocorreu um erro desconhecido no servidor.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erro do cliente: ${error.error.message}`;
    } else {
      errorMessage = `Erro no servidor: ${error.status} - ${error.statusText || ''}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}