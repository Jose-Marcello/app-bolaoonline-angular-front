export interface ApostasCampeonatoTotaisDto {
  // Setor 1
  quantVinculados: number;
  arrecadacaoVinculados: number;
  premioFinalCampeonato: number;

  // Setor 2
  rodadaCorrenteId: string; // Nome ajustado conforme seu novo método
  quantApostasCorrentes: number;
  arrecadacaoCorrente: number;
  premioCorrente: number;

  // Setor 3
  rodadasEmApostaIds: string;
  quantApostasAvulsas: number;
  arrecadacaoAvulsaRodada: number;
  premioLiquidoRodada: number;
}