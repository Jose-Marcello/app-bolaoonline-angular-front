export interface ApostasCampeonatoTotaisDto {
  // Use os nomes EXATOS que o C# envia no JSON (geralmente camelCase)
  quantApostadoresVinculados: number;
  valorArrecadado: number;
  premioAvulsoRodada: number;
  
  // Mantendo os nomes antigos para evitar erros em outras partes, se houver
  numeroDeApostadores?: number;
  valorTotalArrecadado?: number;
}