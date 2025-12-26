import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError, timer, Subscription, of } from 'rxjs';
import { catchError, map, tap, switchMap, repeat, filter } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { UserClaims } from '../models/user-claims.model';
import { NotificationsService } from '../../../core/services/notifications.service';
import { MockEmailService } from '../../../core/services/mock-email.service';

import { TokenRefreshResponseDto } from '../models/TokenRefreshResponseDto';
import { ResetPasswordRequestDto } from '../models/reset-password-request.model';
import { LoginRequestDto } from '../models/login-request.model';
import { RegisterRequestDto } from '../models/register-request.model';
import { LoginResponse } from '../models/login-response.model';
import { RegisterResponse } from '../models/register-response.model';
import { ApiResponse, isPreservedCollection } from '../../../shared/models/api-response.model';
import { NotificationDto } from '../../../shared/models/notification.model';


// Constantes CRÍTICAS
const AUTH_TOKEN_KEY = 'authToken';
const USER_EMAIL_KEY = 'userEmail';
const USER_CLAIMS_KEY = 'userClaims';

// Código de erro da API para email não confirmado (ajuste conforme seu backend)
const EMAIL_NOT_CONFIRMED_CODE = 'E001'; 


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private apiUrlBase = environment.apiUrl;
  private apiUrlAuth = `${this.apiUrlBase}/api`; // Ex: https://localhost:7000/api
  private _isAuthReady = new BehaviorSubject<boolean>(false);
  
  // Subjects para rastrear o estado de autenticação e usuário
  private _isAuthenticated = new BehaviorSubject<boolean>(this.checkToken());
  private _currentUser = new BehaviorSubject<UserClaims | null>(this.getStoredClaims());

  isAuthenticated$ = this._isAuthenticated.asObservable();
  currentUser$ = this._currentUser.asObservable();

  isAuthReady$ = this._isAuthReady.asObservable(); // ✅ Isso resolve o erro da image_4a1598.jpg
 
  
  constructor(
    private http: HttpClient,
    private router: Router,
    private notificationsService: NotificationsService
  ) {
    // Inicialize o estado como pronto após as verificações iniciais
    this._isAuthReady.next(true);
  }
  
  // ====================================================================
  // 🔑 MÉTODO LOGIN CORRIGIDO 🔑
  // ====================================================================

  login(credentials: LoginRequestDto): Observable<ApiResponse<LoginResponse>> {
    console.log('[AuthService] login: Tentando login para:', credentials.email);
  
    
    return this.http.post<ApiResponse<LoginResponse>>(`${this.apiUrlAuth}/account/login`, credentials).pipe(
      tap((response: ApiResponse<LoginResponse>) => {
        
        if (response.success && response.data?.loginSucesso) {
          
          // 1. LOG DE PROVA DE SUCESSO DO BLOCO
          console.log('[AuthService] LOGIN BEM-SUCEDIDO. PREPARANDO PARA SALVAR TOKEN.'); 
          
          // Usa o token recebido da API
          const receivedToken = response.data.token;
          const email = response.data.email;
          
          if (receivedToken) { // Verifica se a API realmente enviou o token
            
            // 2. SALVAR O TOKEN RECEBIDO
            localStorage.setItem(AUTH_TOKEN_KEY, receivedToken);

//         ✅ ADICIONE ESTA LINHA AQUI:
           this._currentUser.next(this.getStoredClaims());
            
            // 3. LOG DE PROVA DE SALVAMENTO
            console.log('[AuthService] SUCESSO ABSOLUTO! TOKEN SALVO:', receivedToken.substring(0, 30) + '...');

            if (email) {
              localStorage.setItem(USER_EMAIL_KEY, email);
            }

            // Atualiza o estado da autenticação
            this._isAuthenticated.next(true); 
            
          } else {
            console.error('[AuthService] Erro: Login Sucesso, mas o campo "token" está ausente na resposta.');
            this.clearSession();
          }
        } 
        
        else {
          // Lógica de FALHA
          console.log('[AuthService] FALHA NA RESPOSTA DA API. LIMPEZA DE SESSÃO.'); 
          this.clearSession();
          
          // Tratamento de erro (simplificado)
          const notifications = response.notifications;
          let isEmailNotConfirmed = false;
          
          // Lógica de verificação de notificação (mantenha sua lógica original aqui)
          
          if (isEmailNotConfirmed) { 
            throw new HttpErrorResponse({ status: 403, statusText: 'Forbidden' });
          } else {
            const errorMessage = response.message || 'Credenciais inválidas.';
            this.notificationsService.showNotification(errorMessage, 'erro');
          }
        }
      }),
      catchError(error => this.handleError(error)) 
    );
  }


  // ====================================================================
  // Métodos Auxiliares (getters e helpers)
  // ====================================================================

  private handleError(error: HttpErrorResponse): Observable<never> {
    // ... (lógica de tratamento de erro)
    return throwError(() => error);
  }

  public getStoredToken(): string | null { 
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  // Método usado pelo Interceptor para invalidar e redirecionar
  public logout(): void {
    console.log('[AuthService] Logout acionado. Limpando sessão.');
    this.clearSession();
    this.router.navigate(['/login']);
  }
  
  public clearSession = (): void => { 
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
    localStorage.removeItem(USER_CLAIMS_KEY);
    this._isAuthenticated.next(false);
    this._currentUser.next(null);
  };
  
  // ... (checkToken, getStoredClaims, decodeToken, e outros métodos de suporte) ...
  
resetPassword(userId: string, code: string, newPassword: string): Observable<ApiResponse<any>> {
    const url = `${this.apiUrlAuth}/reset-password`; // Verifique se esta é a rota correta no seu backend
    const body = { userId, code, newPassword };
    
    return this.http.post<ApiResponse<any>>(url, body);
}

private getStoredClaims(): UserClaims | null {
    const token = localStorage.getItem(AUTH_TOKEN_KEY); 
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('[AuthService] Payload detectado:', payload);

        // ✅ Mapeamento correto conforme o seu log:
      return {
    uid: payload.nameid,
    nome: payload.apelido,
    email: payload.email,
    // Adicionamos os outros campos como nulos ou vazios para satisfazer a interface
    displayName: payload.apelido || '', 
    authToken: token,
    refreshToken: '',
    tokenExpiration: new Date() 
} as UserClaims;
    } catch (error) {
        console.error("Erro ao decodificar claims:", error);
        return null;
    }
}

getStoredUserEmail(): string {
    // Busca o e-mail que foi salvo anteriormente no localStorage
    const email = localStorage.getItem('userEmail'); // Verifique se este é o nome da chave que você usa
    return email || '';
}

resendConfirmationEmail(email: string): Observable<ApiResponse<any>> {
    const url = `${this.apiUrlAuth}/api/account/resend-confirmation-email`; // Ajuste a rota conforme o seu backend
    return this.http.post<ApiResponse<any>>(url, { email });
}

  private checkToken(): boolean {
      const token = this.getStoredToken();
      // Lógica de validação básica (apenas presença do token)
      return !!token;
  }

forgotPassword(email: string): Observable<ApiResponse<any>> {
    // Adicionamos o /account/ para alinhar com o Backend
    const url = `${this.apiUrlAuth}/account/forgot-password`;
    return this.http.post<ApiResponse<any>>(url, { email });
}

register(registrationData: any): Observable<ApiResponse<any>> {
    // Adicionamos o /account/ para bater com o [Route("api/account")] do C#
    const url = `${this.apiUrlAuth}/account/register`; 
    return this.http.post<ApiResponse<any>>(url, registrationData);
}


}