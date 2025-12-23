/**
 * DTO para a resposta de login da API.
 * Corresponde diretamente à estrutura retornada pelo endpoint de login.
 */
export interface LoginResponse {
  loginSucesso: boolean;
  token: string;
  refreshToken: string;
  expiration: string; // Data/hora de expiração do token (como string ISO 8601)
  apelido: string;
  userId: string;
  email?: string; // Opcional, se o backend retornar
  erros?: any; // Opcional, se o backend retornar erros em caso de falha
  // ... outras propriedades que seu backend possa retornar
}
