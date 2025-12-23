// src/app/auth/models/register-response.model.ts

/**
 * Interface que representa os dados de resposta de um registro bem-sucedido do backend.
 * Pode ser simples, como apenas um ID de usuário, ou mais complexo.
 */
export interface RegisterResponse {
  userId: string;
  email: string;
  apelido: string;
  fotoPerfil: string;
  termsAccepted: boolean;
  // Adicione outras propriedades que seu backend retorna após um registro bem-sucedido
}
