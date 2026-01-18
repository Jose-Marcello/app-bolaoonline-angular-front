// src/app/core/interceptors/jwt.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. LISTA NEGRA: Não adicionar token em rotas de autenticação
  // Isso evita que o Azure bloqueie a requisição de login por causa de headers
  if (req.url.includes('/api/account/login') || req.url.includes('/api/account/register')) {
    return next(req);
  }

  const token = localStorage.getItem('authToken');

  // 2. Só anexa se o token for uma string válida e tiver tamanho real
  if (token && token.length > 10) { 
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};