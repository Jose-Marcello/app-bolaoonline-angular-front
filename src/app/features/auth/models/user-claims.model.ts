// Localização: src/app/models/auth/user-claims.model.ts

export interface UserClaims {
  uid: string;
  email: string;
  displayName: string;
  authToken: string;
  refreshToken: string;
  tokenExpiration: Date;
}
