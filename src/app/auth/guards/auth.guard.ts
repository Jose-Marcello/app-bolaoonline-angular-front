// Localização: src/app/core/guards/auth.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '@auth/auth.service';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

export const AuthGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // <<-- AQUI ESTÁ A CORREÇÃO: ADICIONAMOS UMA EXCEÇÃO DIRETA -->>
  if (state.url.startsWith('/testes/email')) {
    console.log('[AuthGuard] Rota de teste. Acesso permitido.');
    return new Observable<boolean>(observer => {
      observer.next(true);
      observer.complete();
    });
  }

  console.log('[AuthGuard] Verificando acesso para a rota:', state.url);

  return authService.isAuthenticated$.pipe(
    take(1),
    map(isAuthenticated => {
      console.log(`[AuthGuard] Estado de autenticação: ${isAuthenticated}.`);
      if (isAuthenticated) {
        console.log('[AuthGuard] Usuário autenticado. Acesso permitido.');
        return true;
      } else {
        console.warn('[AuthGuard] Usuário NÃO autenticado. Redirecionando para /login.');
        router.navigate(['/login']);
        return false;
      }
    })
  );
};