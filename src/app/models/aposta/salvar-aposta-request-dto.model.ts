// Localização: src/app/models/aposta/salvar-aposta-request-dto.model.ts

// ** O nome deste DTO é ApostaJogoRequest e ele é necessário para o SalvarApostaRequestDto **
export interface ApostaJogoRequest {
  jogoId: string;
  placarCasa: number;
  placarVisitante: number;
}

export interface SalvarApostaRequestDto {
  id?: string; // Adicionado para permitir atualização de aposta existente
  campeonatoId: string; 
  rodadaId: string;
  apostadorCampeonatoId: string;
  ehApostaIsolada: boolean;
  identificadorAposta: string;
  apostasJogos: ApostaJogoRequest[]; // Agora usa o DTO recém-criado
  ehCampeonato: boolean;
}