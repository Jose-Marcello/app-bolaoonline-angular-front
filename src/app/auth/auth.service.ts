// Localização: src/app/core/services/auth/auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError, timer, Subscription } from 'rxjs';
import { catchError, map, tap, switchMap, repeat, filter } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { UserClaims } from '@auth/models/user-claims.model';
import { NotificationsService } from '@services/notifications.service';

import { TokenRefreshResponseDto } from '@auth/models/TokenRefreshResponseDto';
import { ResetPasswordRequestDto } from '@auth/models/reset-password-request.model';
import { LoginRequestDto } from '@auth/models/login-request.model';
import { RegisterRequestDto } from '@auth/models/register-request.model';
import { LoginResponse } from '@auth/models/login-response.model';
import { RegisterResponse } from '@auth/models/register-response.model'; // Adicionei o import do RegisterResponse
import { ApiResponse, isPreservedCollection } from '@models/common/api-response.model';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private _isAuthenticated = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this._isAuthenticated.asObservable();

  private _currentUser = new BehaviorSubject<UserClaims | null>(null);
  currentUser$ = this._currentUser.asObservable();

  private _isAuthReady = new BehaviorSubject<boolean>(false);
  isAuthReady$ = this._isAuthReady.asObservable();

  private refreshTokenTimer: any;

  //private apiUrlAuth = `${environment.apiUrl}/api/Account`;
  private apiUrlAuth = `${environment.apiUrl}/Account`;
  
  constructor(private http: HttpClient, private router: Router, private notificationsService: NotificationsService) {
    console.log('[AuthService] Constructor: Iniciando AuthService.');
    this.initializeAuth();
  }

  private initializeAuth(): void {
    console.log('[AuthService] initializeAuth: Iniciando verificação de token e userId no storage.');
    const token = localStorage.getItem('authToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userId = localStorage.getItem('userId');
    const userEmail = localStorage.getItem('userEmail');
    const userName = localStorage.getItem('userName');
    const tokenExpiration = localStorage.getItem('tokenExpiration');

    if (token && refreshToken && userId && userEmail && userName && tokenExpiration) {
      const expiresAt = new Date(tokenExpiration);
      if (expiresAt > new Date()) {
        console.log('[AuthService] Dados de autenticação completos encontrados no storage. Usuário potencialmente logado.');
        const user: UserClaims = {
          uid: userId,
          email: userEmail,
          displayName: userName,
          authToken: token,
          refreshToken: refreshToken,
          tokenExpiration: expiresAt
        };
        this._isAuthenticated.next(true);
        this._currentUser.next(user);
        this.startRefreshTokenTimer(expiresAt.getTime() - Date.now());
      } else {
        console.warn('[AuthService] Token expirado no storage. Tentando refresh...');
        this.refreshToken().subscribe({
          next: () => console.log('[AuthService] Token refresh bem-sucedido durante a inicialização.'),
          error: (err) => {
            console.error('[AuthService] Falha no refresh do token durante a inicialização:', err);
            this.logout();
          }
        });
      }
    } else {
      console.log('[AuthService] Nenhum dado de autenticação completo encontrado no storage.');
      this._isAuthenticated.next(false);
      this._currentUser.next(null);
    }
    this._isAuthReady.next(true);
    console.log('[AuthService] isAuthReady$ definido como true após verificação inicial.');
  }

  login(credentials: LoginRequestDto): Observable<ApiResponse<LoginResponse>> {
    console.log('[AuthService] login: Tentando login para:', credentials.email);
    return this.http.post<ApiResponse<LoginResponse>>(`${this.apiUrlAuth}/login`, credentials).pipe(
      tap((response: ApiResponse<LoginResponse>) => {
        if (response.success && response.data?.loginSucesso) {
          const loginData = isPreservedCollection<LoginResponse>(response.data)
                             ? (response.data.$values && response.data.$values.length > 0 ? response.data.$values[0] : null)
                             : response.data as LoginResponse;
          if (loginData) {
            this.setSession(loginData);
            this.notificationsService.showNotification('Login realizado com sucesso!', 'success');
          } else {
            console.error('[AuthService] login: Dados de login vazios na resposta.');
            this.clearSession();
            this.notificationsService.showNotification('Falha no login: Dados inválidos recebidos.', 'error');
          }
        } else {
          this.clearSession();
          const errorMessage = response.message || 'Credenciais inválidas.';
          this.notificationsService.showNotification(errorMessage, 'error');
          console.error('[AuthService] Login falhou:', errorMessage);
        }
      }),
      catchError(this.handleError)
    );
  }

  register(request: RegisterRequestDto): Observable<ApiResponse<RegisterResponse>> {
    console.log('[AuthService] register: Tentando registro para:', request.email);
    return this.http.post<ApiResponse<RegisterResponse>>(`${this.apiUrlAuth}/register`, request).pipe(
      tap((response: ApiResponse<RegisterResponse>) => {
        if (response.success) {
          const mensagem = response.message || 'Registro realizado com sucesso! Um e-mail de confirmação foi enviado.';
          this.notificationsService.showNotification(mensagem, 'sucesso');
        } else {
          this.clearSession();
          const errorMessage = response.message || 'Falha no registro.';
          this.notificationsService.showNotification(errorMessage, 'error');
          console.error('[AuthService] Registro falhou:', errorMessage);
        }
      }),
      catchError(this.handleError)
    );
  }

  refreshToken(): Observable<ApiResponse<TokenRefreshResponseDto>> {
    const refreshToken = localStorage.getItem('refreshToken');
    const userId = localStorage.getItem('userId');

    if (!refreshToken || !userId) {
      console.warn('[AuthService] refreshToken: Refresh token ou userId não encontrado. Efetuando logout.');
      this.logout();
      return throwError(() => new Error('Refresh token ou ID do usuário não encontrado.'));
    }

    const requestBody = { userId, refreshToken };
    console.log('[AuthService] refreshToken: Tentando refresh de token para userId:', userId);

    return this.http.post<ApiResponse<TokenRefreshResponseDto>>(`${this.apiUrlAuth}/refresh-token`, requestBody).pipe(
      tap((response: ApiResponse<TokenRefreshResponseDto>) => {
        if (response.success && response.data) {
          console.log('[AuthService] refreshToken: Refresh de token bem-sucedido.');
          const tokenData = isPreservedCollection<TokenRefreshResponseDto>(response.data)
                             ? (response.data.$values && response.data.$values.length > 0 ? response.data.$values[0] : null)
                             : response.data as TokenRefreshResponseDto;
          if (tokenData) {
            this.updateSession(tokenData);
          } else {
            console.error('[AuthService] refreshToken: Dados de token vazios na resposta.');
            this.logout();
            throw new Error('Dados de token vazios na resposta de refresh.');
          }
        } else {
          console.error('[AuthService] refreshToken: Falha no refresh de token:', response.message);
          this.logout();
          throw new Error(response.message || 'Falha no refresh de token.');
        }
      }),
      catchError(this.handleError)
    );
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    const url = `${this.apiUrlAuth}/account/reset-password`;
    const body = { token: token, newPassword: newPassword };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(url, body, { headers: headers });
  }

  logout(): void {
    console.log('[AuthService] logout: Limpando sessão e redirecionando.');
    this.clearSession();
    this.stopRefreshTokenTimer();
    this._isAuthenticated.next(false);
    this._currentUser.next(null);
    this.router.navigate(['/login']);
    this.notificationsService.showNotification('Você foi desconectado.', 'info');
  }

  forgotPassword(email: string): Observable<any> {
    const url = `${this.apiUrlAuth}/forgot-password`;
    const body = { email: email };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(url, body, { headers: headers });
  }

  public setSession(credentials: LoginResponse): void {
    let expiresAt: Date;

    if (credentials.expiration && !isNaN(new Date(credentials.expiration).getTime())) {
      expiresAt = new Date(credentials.expiration);
    } else {
      console.warn('[AuthService] Data de expiração inválida recebida, usando data padrão.');
      expiresAt = new Date(new Date().getTime() + 1000);
    }
    
    localStorage.setItem('authToken', credentials.token);
    localStorage.setItem('refreshToken', credentials.refreshToken);
    localStorage.setItem('userId', credentials.userId);
    localStorage.setItem('userEmail', credentials.email || '');
    localStorage.setItem('userName', credentials.apelido);
    localStorage.setItem('tokenExpiration', expiresAt.toISOString());

    const user: UserClaims = {
      uid: credentials.userId,
      email: credentials.email || '',
      displayName: credentials.apelido,
      authToken: credentials.token,
      refreshToken: credentials.refreshToken,
      tokenExpiration: expiresAt
    };
    this._isAuthenticated.next(true);
    this._currentUser.next(user);

    const expiresInMs = expiresAt.getTime() - new Date().getTime();
    this.startRefreshTokenTimer(expiresInMs);
    console.log('[AuthService] Sessão definida. Token expira em:', expiresAt);
  }

  private updateSession(tokenRefreshResponse: TokenRefreshResponseDto): void {
    const expiresAt = new Date(new Date().getTime() + tokenRefreshResponse.expiresIn * 1000);
    localStorage.setItem('authToken', tokenRefreshResponse.authToken);
    localStorage.setItem('refreshToken', tokenRefreshResponse.refreshToken);
    localStorage.setItem('tokenExpiration', expiresAt.toISOString());

    const currentUser = this._currentUser.getValue();
    if (currentUser) {
      const updatedUser: UserClaims = {
        ...currentUser,
        authToken: tokenRefreshResponse.authToken,
        refreshToken: tokenRefreshResponse.refreshToken,
        tokenExpiration: expiresAt
      };
      this._currentUser.next(updatedUser);
    }
    this.startRefreshTokenTimer(tokenRefreshResponse.expiresIn * 1000);
    console.log('[AuthService] Sessão atualizada. Novo token expira em:', expiresAt);
  }

  private clearSession(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('tokenExpiration');
    console.log('[AuthService] Sessão limpa.');
  }

  private startRefreshTokenTimer(delay: number): void {
    this.stopRefreshTokenTimer();
    const refreshDelay = delay - (60 * 1000);
    if (refreshDelay > 0) {
      this.refreshTokenTimer = setTimeout(() => {
        this.refreshToken().subscribe();
      }, refreshDelay);
      console.log(`[AuthService] Agendando refresh de token para daqui a ${Math.round(refreshDelay / 1000)} segundos (${Math.round(refreshDelay / 1000 / 60)} minutos).`);
    } else {
      console.warn('[AuthService] Tempo de expiração muito curto para agendar refresh. Tentando refresh imediato.');
      this.refreshToken().subscribe();
    }
  }

  private stopRefreshTokenTimer(): void {
    if (this.refreshTokenTimer) {
      clearTimeout(this.refreshTokenTimer);
      this.refreshTokenTimer = null;
      console.log('[AuthService] Refresh token timer parado.');
    }
  }

// AQUI ESTÁ O MÉTODO CORRIGIDO
  // Ele agora espera um objeto com a propriedade 'email' e faz a chamada POST.
  resendConfirmationEmail(email: string): Observable<ApiResponse<boolean>> {
    const requestBody = { email: email };
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrlAuth}/resend-email-confirmation`, requestBody);
  }

 public getUserEmail(): string | null {
    return this._currentUser.getValue()?.email || null;
  }

  /*
  resendConfirmationEmail(email: string, scheme: string, host: string): Observable<ApiResponse<boolean>> {
    const request = { email, scheme, host };
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrlAuth}/resend-email-confirmation`, request);
  }
    */
  
  getCurrentUserIdFromSnapshot(): string | null {
    return this._currentUser.getValue()?.uid || null;
  }

  getStoredToken(): string | null {
    return localStorage.getItem('authToken');
  }

  confirmEmail(userId: string, code: string): Observable<ApiResponse<boolean>> {
    return this.http.get<ApiResponse<boolean>>(`${this.apiUrlAuth}/confirm-email?userId=${userId}&code=${code}`);
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('[AuthService] Erro na requisição HTTP:', error);
    return throwError(() => error);
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    this.notificationsService.showNotification(message, type);
    console.log(`[Notification - ${type.toUpperCase()}]: ${message}`);
  }

  getCurrentUser(): Observable<UserClaims | null> {
    return this.currentUser$;
  }
}