// src/app/core/interceptors/jwt.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. Busca a chave correta que definimos no AuthService
  const token = localStorage.getItem('authToken');

  // Log discreto para debug, apenas em desenvolvimento
  // console.log(`[HTTP Interceptor] Requisitando: ${req.url}`);

  if (token) {
    // 2. Anexa o token apenas se ele existir (Modo Apostador)
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  } else {
    // 3. Modo Visitante: A requisição segue "limpa" para as rotas [AllowAnonymous]
    // console.warn('[HTTP Interceptor] Sem token: Acesso como Visitante.');
  }

  return next(req);
};