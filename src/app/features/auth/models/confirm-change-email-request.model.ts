// src/app/auth/models/confirm-change-email-request.model.ts

export interface ConfirmChangeEmailRequestDto {
  userId: string;
  newEmail: string;
  code: string;
}
