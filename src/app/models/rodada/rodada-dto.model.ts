// Localização: src/app/models/rodada/rodada-dto.model.ts   

    import { JogoDto } from '@models/jogo/jogo-dto.model'; // Importa o JogoDto correto

    export enum StatusRodada {
      NaoIniciada = 0,
      EmAposta = 1, // Mantido EmAposta para compatibilidade com o HTML do aposta-rodada-form
      Corrente = 2,
      Finalizada = 3
    }

    export interface RodadaDto {
      id?: string;      
      campeonatoId?: string;
      nome?: string; // Propriedade 'nome' confirmada
      numeroRodada: number;
      // <<-- CORRIGIDO: dataInicio e dataFechamento para DataInic e DataFim como string -->>
      dataInic: string; // Data de início da rodada (string ISO 8601 do backend)
      dataFim: string; // Data de fim da rodada (string ISO 8601 do backend)
      status: StatusRodada;
      jogos?: JogoDto[]; // Referencia o JogoDto atualizado
      // Propriedades adicionais que podem vir do backend, se aplicável
      numJogos?: number; // Número de jogos na rodada (se vier do backend)
      custoApostaRodada?: number; // Custo da aposta na rodada (se vier do backend)
      campeonato?: { id: string, nome: string }; // Objeto Campeonato simplificado, se necessário
    }
    
/*
import { JogoDto } from '@models/jogo/jogo-dto.model'; // Importa o JogoDto correto

export enum StatusRodada {
  NaoIniciada = 0,
  EmAposta = 1, // Mantido EmAposta para compatibilidade com o HTML do aposta-rodada-form
  Corrente = 2,
  Finalizada = 3
}

export interface RodadaDto {
  id?: string;
  campeonatoId?: string;
  nome?: string; // Propriedade 'nome' confirmada
  numeroRodada: number;
  // <<-- CORRIGIDO: dataInicio e dataFechamento para DataInic e DataFim como string -->>
  dataInic: string; // Data de início da rodada (string ISO 8601 do backend)
  dataFim: string; // Data de fim da rodada (string ISO 8601 do backend)
  status: StatusRodada;
  jogosRodada?: JogoDto[]; // <<-- CORRIGIDO AQUI: Renomeado para jogosRodada -->>
  // Propriedades adicionais que podem vir do backend, se aplicável
  numJogos?: number; // Número de jogos na rodada (se vier do backend)
  custoApostaRodada?: number; // Custo da aposta na rodada (se vier do backend)
  campeonato?: { id: string, nome: string }; // Objeto Campeonato simplificado, se necessário
}
*/