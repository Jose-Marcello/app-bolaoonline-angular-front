// Localização: src/app/app.routes.ts

import { Routes } from '@angular/router';
import { AuthGuard } from '@auth/guards/auth.guard';
import { LoginComponent } from '@auth/components/login/login';
import { RegisterComponent } from '@auth/components/register/register';
import { DashboardLayoutComponent } from '@components/dashboard-layout/dashboard-layout.component';
import { DashboardComponent } from '@components/dashboard/dashboard.component';
import { RankingRodadaFormComponent } from '@components/ranking-rodada/ranking-rodada-form.component';
import { RankingCampeonatoFormComponent } from '@components/ranking-campeonato/ranking-campeonato.component';
import { ApostaRodadaResultadosFormComponent } from '@components/aposta-rodada-resultados/aposta-rodada-resultados-form.component';
import { ApostaRodadaFormComponent } from '@components/aposta-rodada/aposta-rodada-form.component';
import { RodadasFinalizadasFormComponent } from '@components/rodadas-finalizadas/rodadas-finalizadas-form.component';
import { PerfilComponent } from '@components/perfil/perfil.component';
import { DepositarComponent } from '@components/financeiro/depositar/depositar.component';
import { ForgotPasswordComponent } from '@auth/components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from '@auth/components/reset-password/reset-password.component';
import { ConfirmEmailComponent } from '@auth/components/confirm-email/confirm-email.component';
import { RespostaConfirmacaoComponent } from '@auth/components/resposta_confirmacao/resposta_confirmacao.component';
import { RegrasBolaoComponent } from '@components/regras-bolao/regras-bolao-form.component'; // Importe o novo componente
import { MockEmailComponent } from '@auth/components/mock-email/mock-email.component';

export const routes: Routes = [
  // 1. Defina as rotas PÚBLICAS primeiro.
  { path: 'testes/email', component: MockEmailComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' },  
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'confirm-email', component: ConfirmEmailComponent },
  { path: 'resposta-confirmacao', component: RespostaConfirmacaoComponent },

  // 2. Agora, defina as rotas PROTEGIDAS.
  {
    path: 'dashboard',
    component: DashboardLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', component: DashboardComponent },
      { path: 'perfil', component: PerfilComponent },
      { path: 'campeonato/:campeonatoId/apostar-rodada/:rodadaId', component: ApostaRodadaFormComponent },
      { path: 'campeonato/:campeonatoId/apostar-rodada', component: ApostaRodadaFormComponent },
      { path: 'campeonato/:campeonatoId/apostar-rodada-resultados/:rodadaId', component: ApostaRodadaResultadosFormComponent },
      { path: 'campeonato/:campeonatoId/apostar-rodada-resultados', component: ApostaRodadaResultadosFormComponent },
      { path: 'campeonato/:campeonatoId/rodadas-finalizadas/:rodadaId', component: RodadasFinalizadasFormComponent },
      { path: 'campeonato/:campeonatoId/rodadas-finalizadas', component: RodadasFinalizadasFormComponent },      
      { path: 'ranking/campeonato/:campeonatoId', component: RankingCampeonatoFormComponent },
      { path: 'ranking/rodada/:campeonatoId/:rodadaId', component: RankingRodadaFormComponent },
      { path: 'financeiro/depositar', component: DepositarComponent },
      { path: 'regrasDoBolao', component: RegrasBolaoComponent }
    ]
  },

  // 3. Rota catch-all para qualquer URL inválida.
  { path: '**', redirectTo: 'login' }
];