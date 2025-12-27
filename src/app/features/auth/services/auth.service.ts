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

// Constantes CRÍTICAS
const AUTH_TOKEN_KEY = 'authToken';
const USER_EMAIL_KEY = 'userEmail';
const USER_CLAIMS_KEY = 'userClaims';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private apiUrlBase = environment.apiUrl;
  private apiUrlAuth = `${this.apiUrlBase}/api`; 
  private _isAuthReady = new BehaviorSubject<boolean>(false);
  
  // Inicialização correta lendo do storage
  private _isAuthenticated = new BehaviorSubject<boolean>(this.checkToken());
  private _currentUser = new BehaviorSubject<UserClaims | null>(this.getStoredClaims());

  isAuthenticated$ = this._isAuthenticated.asObservable();
  currentUser$ = this._currentUser.asObservable();  
  isAuthReady$ = this._isAuthReady.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private notificationsService: NotificationsService
  ) {
    this.checkToken(); 
    this._isAuthReady.next(true);
  }

  // ====================================================================
  // 🔑 MÉTODOS DE AUTENTICAÇÃO
  // ====================================================================

  login(credentials: LoginRequestDto): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.apiUrlAuth}/account/login`, credentials).pipe(
      tap((response: ApiResponse<LoginResponse>) => {
        if (response.success && response.data?.loginSucesso) {
          const receivedToken = response.data.token;
          const email = response.data.email;
          
          if (receivedToken) {
            localStorage.setItem(AUTH_TOKEN_KEY, receivedToken);
            if (email) localStorage.setItem(USER_EMAIL_KEY, email);

            this._isAuthenticated.next(true); 
            this._currentUser.next(this.getStoredClaims());
          }
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
    return this.http.post<ApiResponse<any>>(`${this.apiUrlAuth}/account/register`, registrationData);
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  // ====================================================================
  // 📧 MÉTODOS DE RECUPERAÇÃO E E-MAIL (Recuperados agora)
  // ====================================================================

  forgotPassword(email: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrlAuth}/account/forgot-password`, { email });
  }

  resetPassword(userId: string, code: string, newPassword: string): Observable<ApiResponse<any>> {
    const url = `${this.apiUrlAuth}/reset-password`; 
    const body = { userId, code, newPassword };
    return this.http.post<ApiResponse<any>>(url, body);
  }

  resendConfirmationEmail(email: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrlAuth}/account/resend-confirmation-email`, { email });
  }

  getStoredUserEmail(): string {
    return localStorage.getItem(USER_EMAIL_KEY) || '';
  }

  // ====================================================================
  // 🛠️ MÉTODOS DE SUPORTE E ESTADO
  // ====================================================================

  checkToken(): boolean {
    const token = localStorage.getItem(AUTH_TOKEN_KEY); 
    const isAuth = !!token;

    if (this._isAuthenticated) this._isAuthenticated.next(isAuth);
    if (isAuth && this._currentUser) this._currentUser.next(this.getStoredClaims());

    return isAuth;
  }

  private getStoredClaims(): UserClaims | null {
    const token = localStorage.getItem(AUTH_TOKEN_KEY); 
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        uid: payload.nameid,
        nome: payload.apelido,
        email: payload.email,
        displayName: payload.apelido || '', 
        authToken: token,
        refreshToken: '',
        tokenExpiration: new Date() 
      } as UserClaims;
    } catch (error) {
      return null;
    }
  }

  public clearSession = (): void => { 
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
    localStorage.removeItem(USER_CLAIMS_KEY);
    this._isAuthenticated.next(false);
    this._currentUser.next(null);
  };

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error);
  }
}