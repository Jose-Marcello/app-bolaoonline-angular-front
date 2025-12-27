// Localização: src/app/components/dashboard/dashboard.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription, of, forkJoin, Observable } from 'rxjs';
import { finalize, tap, switchMap, catchError, map, take } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';

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
import { VincularApostadorCampeonatoDto } from '../../../features/campeonato/models/vincular-apostador-campeonato.model';
import { ApostasCampeonatoTotaisDto } from '../../../features/campeonato/models/apostas-campeonato-totais-dto.model';

import { isPreservedCollection } from '../../../shared/models/api-response.model';
import { IsPreservedCollectionPipe } from '../../../core/pipes/is-preserved-collection.pipe';
import { ApostasTotaisCardComponent } from '../../../features/apostas-totais-card/apostas-totais-card.component';

/**
 * Helper para extrair dados do formato $values do .NET
 */
function unwrap<T>(data: any): T {
  if (!data) return data;
  if (isPreservedCollection<any>(data)) {
    return data.$values as unknown as T;
  }
  return data as T;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink, CurrencyPipe, DatePipe,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatListModule, MatExpansionModule,
    MatDialogModule, MatChipsModule, IsPreservedCollectionPipe,
    ApostasTotaisCardComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  isLoading: boolean = true;
  isLoggedIn: boolean = false;
  errorMessage: string | null = null;

  apostador: ApostadorDto | null = null;
  apostadorSaldo: number | null = null;
  campeonatosDisponiveis: CampeonatoDto[] = [];
  campeonatoTotais: { [key: string]: ApostasCampeonatoTotaisDto } = {};

  // Galeria
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

    // ÚNICA FONTE DE VERDADE PARA O LOGIN
    this.subscriptions.add(
      this.authService.isAuthenticated$.subscribe(status => {
        this.isLoggedIn = status;
        console.log('[Dashboard] Status de Autenticação:', status);
        
        if (status) {
          this.loadDashboardData();
        } else {
          this.isLoading = false;
          this.limparDados();
        }
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
    this.campeonatoTotais = {};
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.apostadorService.getDadosApostador().pipe(
      catchError(() => {
        console.warn('[Dashboard] Perfil não encontrado. Operando como Vitrine.');
        return of({ success: true, data: null });
      }),
      tap(response => {
        if (response?.success && response.data) {
          const data = isPreservedCollection<ApostadorDto>(response.data) 
                        ? response.data.$values[0] 
                        : response.data as ApostadorDto;
          
          if (data) {
            this.apostador = data;
            this.apostadorSaldo = data.saldo?.valor || 0;
          }
        }
      }),
      switchMap(() => {
        const userId = this.apostador?.usuarioId || '';
        return this.campeonatoService.getAvailableCampeonatos(userId);
      }),
      map(response => unwrap<CampeonatoDto[]>(response.data) || []),
      switchMap(campeonatos => {
        this.campeonatosDisponiveis = campeonatos;
        if (campeonatos.length === 0) return of([]);

        const detalhamentoTarefas = campeonatos.map(camp => 
          forkJoin({
            emAposta: this.rodadaService.getRodadasEmAposta(camp.id).pipe(catchError(() => of({data: []}))),
            correntes: this.rodadaService.getRodadasCorrentes(camp.id).pipe(catchError(() => of({data: []}))),
            // ADICIONADO: Busca de rodadas finalizadas para o botão Histórico
            finalizadas: this.rodadaService.getRodadasFinalizadas(camp.id).pipe(catchError(() => of({data: []}))),
            totais: this.apostaService.obterTotaisCampeonato(camp.id).pipe(catchError(() => of({data: null})))
          }).pipe(
            tap(res => {
              camp.rodadasEmAposta = unwrap<RodadaDto[]>(res.emAposta.data) || [];
              camp.rodadasCorrentes = unwrap<RodadaDto[]>(res.correntes.data) || [];
              camp.rodadasFinalizadas = unwrap<RodadaDto[]>(res.finalizadas.data) || []; // Preenche o histórico
              if (res.totais.data) this.campeonatoTotais[camp.id] = res.totais.data;
            })
          )
        );
        return forkJoin(detalhamentoTarefas);
      }),
      finalize(() => this.isLoading = false)
    ).subscribe({
      error: (err) => {
        console.error('[Dashboard] Erro crítico:', err);
        this.errorMessage = "Erro ao carregar dados.";
      }
    });
  }

  entrarEmCampeonato(campeonatoId: string): void {
    if (!this.apostador?.id) {
      this.showSnackBar('Identidade do apostador não localizada.', 'Fechar', 'error');
      return;
    }

    const request: VincularApostadorCampeonatoDto = { 
      campeonatoId: campeonatoId, 
      apostadorId: this.apostador.id 
    };

    this.campeonatoService.entrarEmCampeonato(request).subscribe({
      next: (res) => {
        if (res.success) {
          this.showSnackBar('Inscrição realizada com sucesso!', 'Fechar', 'success');
          this.loadDashboardData();
        } else {
          this.showSnackBar(res.message || 'Erro ao entrar.', 'Fechar', 'error');
        }
      }
    });
  }

  navegarParaApostasRodada(campeonatoId: string, rodadaId: string): void {
    const aderidos = unwrap<ApostadorCampeonatoDto[]>(this.apostador?.campeonatosAderidos);
    const vinculo = aderidos?.find(ac => ac.campeonatoId === campeonatoId);

    if (!vinculo) {
      this.showSnackBar('Você precisa aderir ao campeonato primeiro.', 'Fechar', 'warning');
      return;
    }

    this.router.navigate(['/apostas-rodada', campeonatoId, rodadaId], {
      queryParams: { apostadorCampeonatoId: vinculo.id }
    });
  }

  verRodadasCorrentes(campeonatoId: string): void {
    const camp = this.campeonatosDisponiveis.find(c => c.id === campeonatoId);
    if (camp?.rodadasCorrentes?.length) {
      const rodadaId = camp.rodadasCorrentes[0].id;
      const aderidos = unwrap<ApostadorCampeonatoDto[]>(this.apostador?.campeonatosAderidos);
      const vinculo = aderidos?.find(ac => ac.campeonatoId === campeonatoId);
      
      // Se não tiver vinculo, envia null para a tela entrar em MODO CONSULTA
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

// Adicione este método junto aos outros métodos de navegação
  logout(): void {
    this.authService.logout(); // Chama a lógica de limpeza de token do seu serviço
    this.router.navigate(['/auth/login']); // Redireciona para a tela de login que definimos
    this.showSnackBar('Você foi desconectado com sucesso!', 'OK', 'success');
  }

  getCampeonatoLogo(nome: string): string {
    const logos: { [key: string]: string } = {
      'Campeonato Brasileiro 2025 - 1o Turno': '/assets/images/logocampeonatobrasileiroseriea.png',
      'Copa do Mundo de Clubes - FIFA - 2025': '/assets/images/logocopamundialdeclubes.png'
    };
    return logos[nome] || 'https://placehold.co/50x50?text=BOLAO';
  }

  private showSnackBar(msg: string, action: string, type: string) {
    this.snackBar.open(msg, action, { duration: 4000, panelClass: [`snackbar-${type}`] });
  }

  informarEmDesenvolvimento() {
    this.showSnackBar('Funcionalidade em desenvolvimento!', 'OK', 'info');
  }

  navigateToDepositar() { this.router.navigate(['/dashboard/financeiro/depositar']); }
}