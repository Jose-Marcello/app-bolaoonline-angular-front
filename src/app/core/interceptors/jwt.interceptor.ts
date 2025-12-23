// src/app/core/interceptors/jwt.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  // 🚨 BUSCA DIRETA (Sem injetar o AuthService para testar)
  const token = localStorage.getItem('authToken');

  console.error('🚨 MONITOR GLOBAL: Interceptando URL:', req.url);

  if (token) {
    console.log('🚨 MONITOR GLOBAL: Token anexado.');
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};