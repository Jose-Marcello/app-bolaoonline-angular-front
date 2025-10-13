// Localização: src/app/models/campeonato/campeonato-dto.model.ts

import { RodadaDto } from "@models/rodada/rodada-dto.model"; // Importa RodadaDto
import { ApostasAvulsasTotaisDto } from '@models/aposta/apostas-avulsas-totais-dto.model'; // Adicione este import

export interface CampeonatoDto {
  id: string;
  nome: string;
  dataInicio: string; // Formato ISO 8601
  dataFim: string;   // Formato ISO 8601
  numRodadas: number;
  tipo: 'PontosCorridos' | 'Copa'; // Ou enum, se você tiver um no backend
  ativo: boolean;
  custoAdesao: number;
  aderidoPeloUsuario: boolean; // Propriedade para indicar se o usuário já aderiu

  // Adicionadas para o dashboard
  rodadasEmAposta?: RodadaDto[];
  rodadasCorrentes?: RodadaDto[]; 
  rodadasFinalizadas?: RodadaDto[];

// NOVOS CAMPOS
  totaisRodadaEmAposta?: ApostasAvulsasTotaisDto;
  totaisRodadaCorrente?: ApostasAvulsasTotaisDto;

}