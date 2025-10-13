// Localização: src/app/models/apostador/update-perfil-request.model.ts

/**
 * Interface que representa os dados enviados para o endpoint de atualização de perfil.
 */
export interface UpdatePerfilRequestDto {
  apelido: string;
  celular: string;
  fotoPerfil: string;
}