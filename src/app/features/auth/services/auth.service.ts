// Localização: src/app/features/auth/services/auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { UserClaims } from '../models/user-claims.model';
import { NotificationsService } from '../../../core/services/notifications.service';
import { LoginRequestDto } from '../models/login-request.model';
import { LoginResponse } from '../models/login-response.model';
import { ApiResponse } from '../../../shared/models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private apiUrlBase = environment.apiUrl;
  private apiUrlAuth = `${this.apiUrlBase}/api/account`;
  
  // Chaves padronizadas
  private readonly AUTH_TOKEN_KEY = 'authToken';
  private readonly USER_EMAIL_KEY = 'userEmail';
  private readonly USER_DATA_KEY = 'usuario'; // Chave para o objeto com ID

  private _isAuthReady = new BehaviorSubject<boolean>(false);
  private _isAuthenticated = new BehaviorSubject<boolean>(this.hasValidToken());
  private _currentUser = new BehaviorSubject<UserClaims | null>(this.getStoredClaims());

  public isAuthenticated$ = this._isAuthenticated.asObservable();
  public currentUser$ = this._currentUser.asObservable();  
  public isAuthReady$ = this._isAuthReady.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private notificationsService: NotificationsService
  ) {
    this._isAuthReady.next(true);
  }

  // ====================================================================
  // 🔑 MÉTODOS DE AUTENTICAÇÃO
  // ====================================================================

  login(credentials: LoginRequestDto): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.apiUrlAuth}/login`, credentials).pipe(
      tap((response: ApiResponse<LoginResponse>) => {
        if (response.success && response.data?.token) {
          const data = response.data;
          
          // 1. Salva o Token e Email
          localStorage.setItem(this.AUTH_TOKEN_KEY, data.token);
          if (data.email) localStorage.setItem(this.USER_EMAIL_KEY, data.email);

          // 2. CRUCIAL: Salva o ID explicitamente para evitar erro 400 no dashboard
          if (data.userId) {
            localStorage.setItem(this.USER_DATA_KEY, JSON.stringify({ id: data.userId }));
          }

          this._isAuthenticated.next(true); 
          this._currentUser.next(this.getStoredClaims());
        } else {
          this.clearSession();
          const errorMessage = response.message || 'Credenciais inválidas.';
          this.notificationsService.showNotification(errorMessage, 'erro');
        }
      }),
      catchError(error => this.handleError(error))
    );
  }

  register(registrationData: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrlAuth}/register`, registrationData);
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  // ====================================================================
  // 📧 MÉTODOS DE E-MAIL E SUPORTE
  // ====================================================================

  forgotPassword(email: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrlAuth}/forgot-password`, { email });
  }

  resetPassword(userId: string, code: string, newPassword: string): Observable<ApiResponse<any>> {
    const body = { userId, code, newPassword };
    return this.http.post<ApiResponse<any>>(`${this.apiUrlAuth}/reset-password`, body);
  }

  resendConfirmationEmail(email: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrlAuth}/resend-confirmation-email`, { email });
  }

  confirmEmail(userId: string, code: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrlAuth}/ConfirmEmail`, {
      params: { userId, code }
    });
  }

  // ====================================================================
  // 🛠️ AUXILIARES DE ESTADO E TOKEN
  // ====================================================================

  getUsuarioId(): string | null {
    // Tenta primeiro o objeto 'usuario' (mais confiável em Staging)
    const storedUser = localStorage.getItem(this.USER_DATA_KEY);
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.id) return user.id.toString();
    }
    // Backup: Tenta extrair das claims do token
    const claims = this.getStoredClaims();
    return claims ? claims.uid : null;
  }

  getStoredUserEmail(): string {
    return localStorage.getItem(this.USER_EMAIL_KEY) || '';
  }

  obterToken(): string | null {
    return localStorage.getItem(this.AUTH_TOKEN_KEY);
  }

  private hasValidToken(): boolean {
    return !!this.obterToken();
  }

  public getStoredClaims(): UserClaims | null {
    const token = this.obterToken(); 
    if (!token) return null;

    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const payload = JSON.parse(jsonPayload);
      
      return {
        uid: payload.nameid || payload.sub,
        nome: payload.apelido || payload.unique_name,
        email: payload.email,
        displayName: payload.apelido || '', 
        authToken: token,
        refreshToken: '',
        tokenExpiration: payload.exp ? new Date(payload.exp * 1000) : new Date()
      } as UserClaims;
    } catch (error) {
      console.error('Erro ao decodificar claims do token:', error);
      return null;
    }
  }

  public clearSession(): void { 
    localStorage.removeItem(this.AUTH_TOKEN_KEY);
    localStorage.removeItem(this.USER_EMAIL_KEY);
    localStorage.removeItem(this.USER_DATA_KEY);
    this._isAuthenticated.next(false);
    this._currentUser.next(null);
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let msg = 'Ocorreu um erro na autenticação.';
    if (error.status === 401) msg = 'Usuário ou senha inválidos.';
    if (error.status === 0) msg = 'Servidor inacessível. Verifique sua conexão.';
    this.notificationsService.showNotification(msg, 'erro');
    return throwError(() => error);
  }

  estaLogado(): boolean {
    return this.hasValidToken();
  }

  isVisitor(): boolean {
     return !this.hasValidToken();
  }
}