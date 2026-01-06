// Localização correta: src/app/features/aposta-rodada/models/aposta-rodada-resultados-dto.model.ts
import { ApostaJogoResultadoDto } from './aposta-jogo-resultado-dto.model';

export interface ApostaRodadaResultadosDto {
  apostaRodadaId: string;
  pontuacaoTotalRodada: number;
  jogosComResultados: ApostaJogoResultadoDto[];
}