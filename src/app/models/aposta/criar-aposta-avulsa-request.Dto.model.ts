// models/aposta/criar-aposta-avulsa-request-dto.model.ts
export interface CriarApostaAvulsaRequestDto {
  rodadaId: string;
  campeonatoId: string;  
  apostadorId:string;
  custoAposta: number;    
}