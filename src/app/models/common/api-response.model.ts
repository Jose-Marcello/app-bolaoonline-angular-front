    // src/app/models/common/api-response.model.ts

    import { NotificationDto } from '@models/common/notification.model'; // Importa NotificationDto

    /**
     * Representa uma coleção de itens com metadados de serialização,
     * como $id e $values, comumente usado em serialização JSON com referência.
     */
          
    
    export interface PreservedCollection<T> {
      $id: string;
      $values: T[]; // O array de valores
    }

    /**
     * Define o tipo para listas de notificações, que podem ser um array simples
     * ou uma PreservedCollection de NotificationDto.
     */
    export type NotificationList = NotificationDto[] | PreservedCollection<NotificationDto>;

    /**
     * Interface genérica para a estrutura de resposta da API.
     */
    export interface ApiResponse<T> {
      success: boolean;
      //data?: T | PreservedCollection<T>; // O dado retornado, pode ser um objeto ou uma coleção
      data?: T; // Remova o union type `| PreservedCollection<T>`
      message?: string;
      notifications?: NotificationList; // Lista de notificações ou erros
      errors?: any; // Pode ser um objeto de erros de validação ou um array de strings
      title?: string; // Título do problema (para Problem Details)
      detail?: string; // Detalhe do problema (para Problem Details)
      status?: number; // Status HTTP (para Problem Details)
      type?: string; // Tipo do problema (para Problem Details)
      instance?: string; // Instância do problema (para Problem Details)
    }

    /**
     * Type guard para verificar se um objeto é uma PreservedCollection.
     * @param obj O objeto a ser verificado.
     * @returns True se o objeto for uma PreservedCollection, false caso contrário.
     */
    export function isPreservedCollection<T>(obj: any): obj is PreservedCollection<T> {
      return obj && typeof obj === 'object' && '$id' in obj && '$values' in obj && Array.isArray(obj.$values);
    }

    /**
     * Função auxiliar para extrair os valores de uma PreservedCollection
     * ou retornar o próprio objeto se não for uma.
     * @param data O objeto a ser processado.
     * @returns O array de valores se for uma PreservedCollection, ou o objeto original.
     */
    export function extractCollectionValues<T>(data: T | PreservedCollection<T> | undefined | null): T[] | T | undefined | null {
      if (isPreservedCollection<T>(data)) {
        return data.$values;
      }
      // Se for um array simples (não uma PreservedCollection com $values), retorna o próprio array
      if (Array.isArray(data)) {
        return data;
      }
      return data; // Retorna o objeto original se não for uma coleção
    }
    