// src/app/core/models/relatorios/conferencia-palpite-dto.model.ts

export interface ConferenciaPalpiteDto {
  apelidoApostador: string;
  identificadorAposta: string;
  dataHoraEnvio: Date;
  nomeEquipeCasa: string;
  placarPalpiteCasa: number;
  placarPalpiteVisita: number;
  nomeEquipeVisita: string;
  dataJogo: string;
  horaJogo: string;
  // Propriedades do campeonato/rodada que a API pode retornar
  //nomeCampeonato?: string;
  //numeroRodada?: number;
}