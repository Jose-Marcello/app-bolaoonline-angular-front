// src/app/models/aposta/aposta-rodada-status.model.ts

export interface ApostaRodadaStatusDto {
  apostaId: string;
  rodadaId: string;
  campeonatoId: string;
  apostadorId: string;
  statusAposta: number; // Ex: 1-Pendente, 2-Enviada, 3-Concluida, 4-Cancelada
  identificadorAposta: string;
  dataAposta: string; // Ou Date
  totalPontos?: number | null; // Pontuação total da aposta na rodada (se aplicável)
  custoAposta?: number | null; // Custo da aposta na rodada
  // Você pode adicionar outras propriedades aqui que sejam relevantes para o status da aposta na rodada
}
