// src/app/auth/models/reset-password-request.model.ts

export interface ResetPasswordRequestDto {
  userId: string;
  token: string;
  newPassword: string;
  email:string;
  confirmNewPassword: string; // Adicionado para validação no frontend
}
