// Localização: src/app/core/pipes/is-preserved-collection.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';
// <<-- CORREÇÃO AQUI: A tipagem de PreservedCollection deve ser para o tipo T, não T[] -->>
import { PreservedCollection } from '@models/common/api-response.model';

/**
 * Pipe que verifica se um valor é uma PreservedCollection e retorna seu array $values,
 * ou o próprio valor se já for um array.
 * Útil para usar em *ngFor quando a API pode retornar dados em formato PreservedCollection.
 *
 * Uso:
 * <div *ngFor="let item of (data | isPreservedCollection)">
 * {{ item.propriedade }}
 * </div>
 *
 * Ou para forçar a conversão para array (mesmo que não seja PreservedCollection):
 * <div *ngFor="let item of (data | isPreservedCollection : true)">
 * {{ item.propriedade }}
 * </div>
 */
@Pipe({
  name: 'isPreservedCollection',
  standalone: true // Marca o pipe como standalone
})
export class IsPreservedCollectionPipe implements PipeTransform {
  // <<-- CORREÇÃO AQUI: O valor de entrada pode ser PreservedCollection<T> (um array de Ts) ou T[] -->>
  transform<T>(value: PreservedCollection<T> | T[] | undefined | null, forceArray: boolean = false): T[] {
    if (value === null || value === undefined) {
      return [];
    }

    // Verifica se é uma PreservedCollection
    // A propriedade $values em PreservedCollection<T> é T[]
    if (typeof value === 'object' && value !== null && '$values' in value) {
      return (value as PreservedCollection<T>).$values || [];
    }

    // Se já for um array, retorna-o
    if (Array.isArray(value)) {
      return value;
    }

    // Se forceArray for true e não for array nem PreservedCollection, retorna um array com o item
    if (forceArray) {
      return [value as T];
    }

    return [];
  }
}
