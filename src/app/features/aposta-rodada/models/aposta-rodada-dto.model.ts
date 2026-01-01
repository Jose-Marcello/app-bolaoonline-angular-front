// Localização: src/app/models/aposta/aposta-rodada-dto.model.ts

import { PreservedCollection } from '../../../shared/models/api-response.model';
import { PalpiteDto } from '../../../features/aposta-rodada/models/palpite-dto.model'; // Importa o novo PalpiteDto

/**
 * Representa uma aposta de rodada completa.
 */
export interface ApostaRodadaDto {
  $id?: string; // Propriedade de serialização do .NET, opcional
  id: string;
  apostadorCampeonatoId: string;
  rodadaId: string;
  identificadorAposta: string | null;
  podeEditar: boolean;
  dataHoraSubmissao: string | null;
  ehApostaCampeonato: boolean;
  ehApostaIsolada: boolean;
  custoPagoApostaRodada: number | null;
  pontuacaoTotalRodada: number;
  statusAposta: number; // 0: Não Enviada, 1: Enviada, etc.
  enviada: boolean;
  numJogosApostados: number;
  apostadorCampeonato: any | null; // Pode ser tipado mais especificamente se você tiver ApostadorCampeonatoDto
  
  // <<-- NOVO: Adicionado a propriedade palpites -->>
  palpites?: PreservedCollection<PalpiteDto>; // A coleção de palpites de jogo
}
