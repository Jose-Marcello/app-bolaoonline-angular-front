// Localização: src/app/models/auth/token-refresh-response-dto.model.ts

/**
 * DTO para a resposta de um refresh de token da API.
 * Corresponde à estrutura retornada pelo endpoint de refresh-token.
 */
export interface TokenRefreshResponseDto {
  authToken: string;
  refreshToken: string;
  expiresIn: number; // Duração em segundos
  // Adicione outras propriedades se o seu backend retornar (ex: userId, email)
  userId?: string;
  email?: string;
  userName?: string;
}
