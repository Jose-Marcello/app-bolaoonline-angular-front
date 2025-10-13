// Localização: src/app/core/utils/api-response-handler.ts

import { Observable, OperatorFunction } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, PreservedCollection, isPreservedCollection } from '@models/common/api-response.model';

/**
 * Função utilitária para desempacotar a propriedade 'data' de um ApiResponse,
 * lidando com a estrutura de PreservedCollection do .NET em múltiplos níveis.
 *
 * Retorna um OperatorFunction para ser usado diretamente no pipe do RxJS.
 *
 * @returns Um OperatorFunction que transforma um Observable<ApiResponse<any>>
 * em um Observable<ApiResponse<T[] | T | null>> com a 'data' desempacotada.
 */
export function handleApiResponse<T>(): OperatorFunction<ApiResponse<any>, ApiResponse<T[] | T | null>> {
  return (source$: Observable<ApiResponse<any>>) => source$.pipe(
    map(apiResponse => {
      let extractedData: T[] | T | null = null;
      let currentData = apiResponse.data;

      if (apiResponse.success && currentData !== undefined && currentData !== null) {
        if (isPreservedCollection<T>(currentData)) {
          // Caso 1: data é uma PreservedCollection<T> (para listas onde $values contém DTOs diretamente)
          extractedData = currentData.$values || [];
          console.log('[ApiResponseHandler] Data é PreservedCollection<T>. Extraindo $values.');
        } else if (isPreservedCollection<T[]>(currentData)) {
          // Caso 2: data é uma PreservedCollection<T[]> (para listas onde $values contém um array de T)
          // Este é o caso que causa o erro "missing length, pop, push"
          extractedData = currentData.$values && currentData.$values.length > 0
            ? currentData.$values[0] as T[] // Pega o primeiro (e único) array dentro do $values
            : [];
          console.log('[ApiResponseHandler] Data é PreservedCollection<T[]>. Extraindo o array interno de $values.');
        } else if (Array.isArray(currentData)) {
          // Caso 3: data é um array direto (fallback)
          extractedData = currentData as T[];
          console.warn('[ApiResponseHandler] Data é um array direto, sem PreservedCollection.');
        } else {
          // Caso 4: data é um objeto singular (para obter por ID)
          extractedData = currentData as T;
          console.log('[ApiResponseHandler] Data é um objeto singular.');
        }
      } else if (!apiResponse.success) {
        console.warn('[ApiResponseHandler] API Response indica falha:', apiResponse.message || apiResponse.errors);
      } else {
        console.warn('[ApiResponseHandler] API Response sem dados ou formato inesperado:', apiResponse);
      }

      // Constrói um novo objeto ApiResponse com a 'data' já desempacotada para o tipo desejado
      return {
        ...apiResponse,
        data: extractedData
      } as ApiResponse<T[] | T | null>;
    })
  );
}
