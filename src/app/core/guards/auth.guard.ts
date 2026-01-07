// Localização: src/app/core/guards/auth.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';
import { map, take, } from 'rxjs/operators';
import { Observable,of } from 'rxjs';

export const AuthGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  

  // 1️⃣ LIBERAÇÃO AMPLA PARA O MODO VISITANTE
// Liberamos o dashboard, a raiz e a rota de apostas
if (state.url === '/dashboard' || state.url === '/' || state.url.includes('/apostas-rodada')) {
    console.log('[AuthGuard] 🔓 ACESSO VISITANTE: Portão totalmente aberto para', state.url);
    return of(true); 
}

  // 2️⃣ EXCEÇÃO DE TESTE (Se você ainda usar)
  if (state.url.startsWith('/testes/email')) {
    return of(true);
  }

  // 3️⃣ REGRA DE SEGURANÇA (Para o Jeff_Bolinha e outros usuários reais)
  // Só chega aqui se não for uma das rotas liberadas acima
  return authService.isAuthenticated$.pipe(
    take(1),
    map(isAuthenticated => {
      if (isAuthenticated) return true;

      console.warn('[AuthGuard] 🔐 Bloqueado. Redirecionando para login.');
      router.navigate(['/auth/login']);
      return false;
    })
  );
};