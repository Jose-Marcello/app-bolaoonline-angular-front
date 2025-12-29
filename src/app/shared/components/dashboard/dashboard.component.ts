import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription, of, forkJoin } from 'rxjs';
import { finalize, tap, switchMap, catchError, map } from 'rxjs/operators';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSnackBar } from '@angular/material/snack-bar';

// Serviços e Modelos
import { AuthService } from '../../../features/auth/services/auth.service';
import { CampeonatoService } from '../../../core/services/campeonato.service';
import { RodadaService } from '../../../core/services/rodada.service';
import { ApostadorService } from '../../../core/services/apostador.service';
import { ApostaService } from '../../../core/services/aposta.service';

import { CampeonatoDto } from '../../../features/campeonato/models/campeonato-dto.model';
import { RodadaDto } from '../../../features/rodada/model/rodada-dto.model';
import { ApostadorDto } from '../../../features/apostador/models/apostador-dto.model';
import { ApostadorCampeonatoDto } from '../../../features/apostador-campeonato/models/apostador-campeonato-dto.model';
import { ApostasCampeonatoTotaisDto } from '../../../features/campeonato/models/apostas-campeonato-totais-dto.model';

import { isPreservedCollection } from '../../../shared/models/api-response.model';

function unwrap<T>(data: any): T {
  if (!data) return data;
  if (isPreservedCollection<any>(data)) { return data.$values as unknown as T; }
  return data as T;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink, CurrencyPipe, DatePipe,
    MatCardModule, MatButtonModule, MatIconModule, MatToolbarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  isLoading: boolean = true;
  apostador: ApostadorDto | null = null;
  apostadorSaldo: number | null = null;
  campeonatosDisponiveis: CampeonatoDto[] = [];
  campeonatoTotais: { [key: string]: ApostasCampeonatoTotaisDto } = {};

  // Galeria de Marketing
  indiceAtual = 0;
  fotos: string[] = Array.from({ length: 11 }, (_, i) => `assets/marketing/parceiros/EspMar-foto${i + 1}.jpeg`);
  fotoAtual: string = this.fotos[0];
  intervaloGaleria: any;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private campeonatoService: CampeonatoService,
    private rodadaService: RodadaService,
    private apostadorService: ApostadorService,
    private apostaService: ApostaService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.iniciarCarrossel();
    this.subscriptions.add(
      this.authService.isAuthenticated$.subscribe(status => {
        if (status) this.loadDashboardData();
        else { this.isLoading = false; this.limparDados(); }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.intervaloGaleria) clearInterval(this.intervaloGaleria);
  }

  private limparDados(): void {
    this.apostador = null;
    this.apostadorSaldo = null;
    this.campeonatosDisponiveis = [];
  }

  loadDashboardData(): void {
  this.isLoading = true;

  this.apostadorService.getDadosApostador().pipe(
    // Tratamento de erro inicial para evitar o alerta de "desconectado" indevido
    catchError(() => of({ success: false, data: null })),
    tap(response => {
      if (response?.success && response.data) {
        const data = isPreservedCollection<ApostadorDto>(response.data) 
                    ? response.data.$values[0] : response.data as ApostadorDto;
        if (data) {
          this.apostador = data;
          this.apostadorSaldo = data.saldo?.valor || 0;
        }
      }
    }),
    // Busca campeonatos baseados no ID do apostador carregado acima
    switchMap(() => this.campeonatoService.getAvailableCampeonatos(this.apostador?.usuarioId || '')),
    map(response => unwrap<CampeonatoDto[]>(response.data) || []),
    switchMap(campeonatos => {
      this.campeonatosDisponiveis = campeonatos;
      if (campeonatos.length === 0) return of([]);

      // Cria a bateria de chamadas paralelas para cada campeonato
      const detalhamentoTarefas = campeonatos.map(camp => 
        forkJoin({
          emAposta: this.rodadaService.getRodadasEmAposta(camp.id).pipe(catchError(() => of({ success: false, data: [] }))),
          correntes: this.rodadaService.getRodadasCorrentes(camp.id).pipe(catchError(() => of({ success: false, data: [] }))),
          finalizadas: this.rodadaService.getRodadasFinalizadas(camp.id).pipe(catchError(() => of({ success: false, data: [] }))),
          totais: this.apostaService.obterTotaisCampeonato(camp.id).pipe(catchError(() => of({ success: false, data: null })))
        }).pipe(
          tap(res => {
            // Sincronização e Blindagem das Rodadas
            camp.rodadasEmAposta = unwrap<RodadaDto[]>(res.emAposta?.data) || [];
            camp.rodadasCorrentes = unwrap<RodadaDto[]>(res.correntes?.data) || [];
            camp.rodadasFinalizadas = unwrap<RodadaDto[]>(res.finalizadas?.data) || [];
            
            if (res.totais?.data) {
              this.campeonatoTotais[camp.id] = res.totais.data;
            }
          })
        )
      );
      return forkJoin(detalhamentoTarefas);
    }),
    // O FINALIZE entra aqui, após todos os switchMaps
    finalize(() => {
      this.isLoading = false;
    })
  ).subscribe({
    error: (err) => {
      console.error('Erro crítico no Dashboard:', err);
      this.isLoading = false;
    }
  });
}

  // ✅ NAVEGAÇÃO LIBERADA (REMOVIDO IF !VINCULO)
  navegarParaApostasRodada(campeonatoId: string): void {
    const camp = this.campeonatosDisponiveis.find(c => c.id === campeonatoId);
    if (camp?.rodadasEmAposta?.length) {
      const rodadaId = camp.rodadasEmAposta[0].id;
      const aderidos = unwrap<ApostadorCampeonatoDto[]>(this.apostador?.campeonatosAderidos);
      const vinculo = aderidos?.find(ac => ac.campeonatoId === campeonatoId);

      this.router.navigate(['/apostas-rodada', campeonatoId, rodadaId], {
        queryParams: { apostadorCampeonatoId: vinculo?.id || null }
      });
    } else {
      this.showSnackBar('Nenhuma rodada aberta para apostas.', 'Fechar', 'info');
    }
  }

  verRodadasCorrentes(campeonatoId: string): void {
    const camp = this.campeonatosDisponiveis.find(c => c.id === campeonatoId);
    if (camp?.rodadasCorrentes?.length) {
      const rodadaId = camp.rodadasCorrentes[0].id;
      const aderidos = unwrap<ApostadorCampeonatoDto[]>(this.apostador?.campeonatosAderidos);
      const vinculo = aderidos?.find(ac => ac.campeonatoId === campeonatoId);
      
      this.router.navigate(['/apostas-resultados', campeonatoId, rodadaId], {
        queryParams: { apostadorCampeonatoId: vinculo?.id || null }
      });
    } else {
      this.showSnackBar('Nenhuma rodada em andamento.', 'Fechar', 'info');
    }
  }

  verRodadasFinalizadas(campeonatoId: string): void {
    const camp = this.campeonatosDisponiveis.find(c => c.id === campeonatoId);
    if (camp?.rodadasFinalizadas?.length) {
      const rodadaId = camp.rodadasFinalizadas[0].id;
      const aderidos = unwrap<ApostadorCampeonatoDto[]>(this.apostador?.campeonatosAderidos);
      const vinculo = aderidos?.find(ac => ac.campeonatoId === campeonatoId);
      
      this.router.navigate(['/apostas-resultados', campeonatoId, rodadaId], {
        queryParams: { apostadorCampeonatoId: vinculo?.id || null }
      });
    } else {
      this.showSnackBar('Nenhum histórico disponível.', 'Fechar', 'info');
    }
  }

  iniciarCarrossel() {
    this.intervaloGaleria = setInterval(() => {
      this.indiceAtual = (this.indiceAtual + 1) % this.fotos.length;
      this.fotoAtual = this.fotos[this.indiceAtual];
    }, 4000);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  getCampeonatoLogo(nome: string): string {
    const logos: { [key: string]: string } = {
      'Campeonato Brasileiro 2025 - 1o Turno': '/assets/images/logocampeonatobrasileiroseriea.png',
      'Copa do Mundo de Clubes - FIFA - 2025': '/assets/images/logocopamundialdeclubes.png'
    };
    return logos[nome] || 'assets/images/logo-bola.png';
  }

  private showSnackBar(msg: string, action: string, type: string) {
    this.snackBar.open(msg, action, { duration: 4000, panelClass: [`snackbar-${type}`] });
  }

  navigateToDepositar() { this.router.navigate(['/dashboard/financeiro/depositar']); }
  informarEmDesenvolvimento() { this.showSnackBar('Em desenvolvimento!', 'OK', 'info'); }
}