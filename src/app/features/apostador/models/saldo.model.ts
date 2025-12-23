// Localização: src/app/models/apostador/saldo.model.ts

/**
 * DTO para representar o Saldo de um apostador.
 * Confirmado com a estrutura do backend SaldoDto.cs.
 */
export interface SaldoDto {
  id: string; // ID do Saldo (provavelmente Guid no backend)
  apostadorId: string; // ID do Apostador associado ao Saldo
  valor: number;
  dataUltimaAtualizacao?: Date; // Pode ser string ou Date, dependendo da API
}
 