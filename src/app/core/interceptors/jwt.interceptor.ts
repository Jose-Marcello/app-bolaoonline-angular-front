// Localização: src/app/core/interceptors/jwt.interceptor.ts

import { HttpRequest, HttpHandlerFn, HttpEvent, HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@auth/auth.service'; // <<-- AJUSTE O CAMINHO

/**
 * Interceptor de requisições HTTP para adicionar o token JWT
 * e lidar com erros 401 Unauthorized.
 * Implementado como uma HttpInterceptorFn (função de interceptor)
 * para compatibilidade com provideHttpClient(withInterceptors).
 */
export const jwtInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  // Injeta os serviços usando a função `inject()`
  const authService = inject(AuthService);
  const router = inject(Router);

  // Obter o token JWT do AuthService usando o getter público
  const token = authService.getStoredToken(); // <<-- CORREÇÃO AQUI: Usando o novo getter público

  // Se o token existe, clone a requisição e adicione o cabeçalho de autorização
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Passa a requisição (original ou clonada com o token) para o próximo manipulador
  return next(req).pipe( // Use next(req) para passar a requisição clonada/original
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        console.error('JWT Interceptor: 401 Unauthorized detectado, realizando logout.');
        // Opcional: Adicionar notificação para o usuário
        // notificationService.showNotification('Sessão expirada ou não autorizada. Por favor, faça login novamente.', 'Erro');

        // Realizar logout se 401 for recebido
        authService.logout(); // Chama o método logout do AuthService
        router.navigate(['/login']); // Redireciona para a tela de login
      }
      return throwError(() => error);
    })
  );
};
