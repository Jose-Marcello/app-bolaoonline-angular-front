// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LayoutComponent } from './core/layout/layout.component'; // Shell da área logada
import { DashboardComponent } from './shared/components/dashboard/dashboard.component'; 
import { AuthGuard } from './core/guards/auth.guard'; // Para proteger a área logada
// src/app/app.routes.ts

// ... outros imports
import { ApostaRodadaFormComponent } from './features/aposta-rodada/aposta-rodada-form.component';
import { ApostaRodadaResultadosFormComponent } from './features/aposta-rodada-resultados/aposta-rodada-resultados-form.component';
import { RankingRodadaFormComponent } from './features/ranking-rodada/ranking-rodada-form.component';
import { RankingCampeonatoFormComponent } from './features/ranking-campeonato/ranking-campeonato.component';
import { RegrasBolaoComponent } from './features/regras-bolao/regras-bolao-form.component'; 
import { PerfilComponent } from './features/perfil/perfil.component'; 

import { DepositarComponent } from './features/financeiro/depositar/depositar.component'; 

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  
  {
    path: '',
    component: LayoutComponent, 
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      
      // 🚀 AS PONTES RECONSTRUÍDAS:
      { 
        path: 'apostas-rodada/:campeonatoId/:rodadaId', 
        component: ApostaRodadaFormComponent 
      },
      { 
        path: 'apostas-resultados/:campeonatoId/:rodadaId', 
        component: ApostaRodadaResultadosFormComponent 
      },

// 🚀 AS ROTAS QUE FALTAVAM:
      { 
        path: 'dashboard/ranking/rodada/:campeonatoId/:rodadaId', 
        component: RankingRodadaFormComponent 
      },
      { 
        path: 'dashboard/ranking/campeonato/:campeonatoId', 
        component: RankingCampeonatoFormComponent 
      },

      { path: 'home', redirectTo: 'dashboard', pathMatch: 'full' }, 
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, 
    ]
  },

{ 
  path: 'dashboard/regrasDoBolao',
  component: RegrasBolaoComponent
  // Se tiver 'canActivate: [AuthGuard]' aqui, ele vai pedir login sempre!
  },

  { 
  path: 'dashboard/perfil',
  component: PerfilComponent
  // Se tiver 'canActivate: [AuthGuard]' aqui, ele vai pedir login sempre!
  },

  // No seu app.routes.ts, dentro do array children: [ ... ]
{ 
  path: 'dashboard/financeiro/depositar', 
  component: DepositarComponent 
},
{ 
  path: 'dashboard/financeiro/sacar', 
  component: SacarComponent // Se já tiver este componente criado
},


  { path: '**', redirectTo: 'auth/login' }


];