// Localização: src/app/models/rodada/rodada.model.ts

import { CampeonatoDto } from '../campeonato/campeonato-dto.model';
import { PreservedCollection } from '../common/api-response.model';

// Adicionado o enum StatusRodada, exportado para ser acessível
export enum StatusRodada {
  NaoIniciada = 0,
  EmApostas = 1,
  Corrente = 2,
  Finalizada = 3
}

export interface Rodada {
  id: string;
  campeonatoId: string;
  numeroRodada: number;
  dataInic: string; // Confirmado: dataInic
  dataFim: string;
  numJogos: number; // Número de jogos na rodada
  status: StatusRodada; // CORREÇÃO: Usando o enum StatusRodada e nome da propriedade 'status'
  custoApostaRodada: number;

  // Propriedades aninhadas conforme a resposta da API
  campeonato?: CampeonatoDto; // Objeto Campeonato aninhado, pode ser opcional dependendo do uso
  jogosRodada?: PreservedCollection<any> | any[]; // Pode ser uma coleção preservada ou array de jogos (precisaria de um modelo JogoRodada)
  rankingRodadas?: PreservedCollection<any> | any[]; // Coleção de ranking (precisaria de um modelo RankingRodada)
  apostasRodada?: PreservedCollection<any> | any[]; // Coleção de apostas (precisaria de um modelo ApostaRodada)
}