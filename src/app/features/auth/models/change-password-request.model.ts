// src/app/auth/models/change-password-request.model.ts

export interface ChangePasswordRequestDto {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string; // Adicionado para validação no frontend
}
