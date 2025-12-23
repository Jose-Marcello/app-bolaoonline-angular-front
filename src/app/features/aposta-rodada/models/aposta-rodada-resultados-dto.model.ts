// Localização: src/app/models/aposta/aposta-jogo-visualizacao-dto.model.ts
import { ApostaJogoResultadoDto } from './aposta-jogo-resultado-dto.model';

export interface ApostaRodadaResultadosDto {
  apostaRodadaId: string;
  pontuacaoTotalRodada: number;
  jogosComResultados: ApostaJogoResultadoDto[];
}