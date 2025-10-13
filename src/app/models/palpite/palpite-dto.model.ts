// Localização: src/app/models/aposta/palpite-dto.model.ts
import { JogoDto } from '@models/jogo/jogo-dto.model'; // Importa JogoDto

/**
 * Representa um palpite de jogo individual retornado pelo backend.
 * Nota: As propriedades de placar usam 'placarApostaCasa' e 'placarApostaVisita'
 * para corresponder ao DTO do backend.
 */
export interface PalpiteDto {
  $id?: string; // Propriedade de serialização do .NET, opcional
  id: string;
  jogoId: string;
  apostaRodadaId: string;
  placarApostaCasa: number | null;
  placarApostaVisita: number | null;
  pontos: number;
  jogo: JogoDto; // <<-- CORRIGIDO: Agora é JogoDto
}
 