// Localização: src/app/components/dashboard/dashboard.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

// Importações do Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';

import { Subscription, Observable, combineLatest, of, forkJoin } from 'rxjs';
import { finalize, tap, filter, switchMap, take, catchError, map, startWith } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

// Importa os serviços e modelos necessários
import { AuthService } from '@auth/auth.service';
import { CampeonatoService } from '@services/campeonato.service';
import { RodadaService } from '@services/rodada.service';
import { ApostadorService } from '@services/apostador.service';
import { ApostadorCampeonatoService } from '@services/apostadorCampeonato.service';
import { ApostaService } from '@services/aposta.service'; // Adicionado
import { ApostasAvulsasTotaisDto } from '@models/aposta/apostas-avulsas-totais-dto.model'; // Adicionado

import { CampeonatoDto } from '@models/campeonato/campeonato-dto.model';
import { RodadaDto } from '@models/rodada/rodada-dto.model';
import { ApostadorDto } from '@models/apostador/apostador-dto.model';
import { ApostadorCampeonatoDto } from '@models/apostador-campeonato/apostador-campeonato-dto.model';
import { VincularApostadorCampeonatoDto } from '@models/campeonato/vincular-apostador-campeonato.model';

import { ApiResponse, isPreservedCollection, PreservedCollection } from '@models/common/api-response.model';
import { NotificationDto } from '@models/common/notification.model';
import { IsPreservedCollectionPipe } from '@core/pipes/is-preserved-collection.pipe';

import { ApostasTotaisCardComponent } from '../apostas-totais-card/apostas-totais-card.component'; // Adicionado
import { ApostasCampeonatoTotaisDto } from '@models/campeonato/apostas-campeonato-totais-dto.model';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatExpansionModule,
    MatDialogModule,
    MatChipsModule,
    IsPreservedCollectionPipe,
    ApostasTotaisCardComponent // Adicionado
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  isLoading: boolean = true;
  isLoggingOut: boolean = false;
  errorMessage: string | null = null;
  notifications: NotificationDto[] = [];

  apostador: ApostadorDto | null = null;
  apostadorSaldo: number | null = null;
  campeonatosDisponiveis: CampeonatoDto[] = [];

  campeonatoTotais: { [key: string]: ApostasCampeonatoTotaisDto } = {};
  taxaAdministrativa = 0.20;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private campeonatoService: CampeonatoService,
    private rodadaService: RodadaService,
    private apostadorService: ApostadorService,
    private apostadorCampeonatoService: ApostadorCampeonatoService,
    private apostaService: ApostaService,
    private router: Router,
    private snackBar: MatSnackBar,
    public dialog: MatDialog
  ) {
    console.log('[DashboardComponent] Constructor: isLoading:', this.isLoading);
  }

  ngOnInit(): void {
    //this.obterCampeonatosDisponiveis();
    console.log('[DashboardComponent] ngOnInit: Iniciado.');
    this.subscriptions.add(
      this.authService.isAuthenticated$.pipe(
        filter(isAuthenticated => isAuthenticated),
        take(1)
      ).subscribe(() => {
        console.log('[DashboardComponent] Usuário autenticado. Carregando dados do dashboard...');
        this.loadDashboardData();
      })
    );
  }


  ngOnDestroy(): void {
    console.log('[DashboardComponent] ngOnDestroy: Desinscrevendo todas as subscriptions.');
    this.subscriptions.unsubscribe();
  }

  /**
   * Carrega todos os dados necessários para o dashboard: dados do apostador,
   * e campeonatos disponíveis para adesão.
   */
  loadDashboardData(): void {
  console.log('[DashboardComponent] loadDashboardData: Iniciando carregamento de dados...');
  this.isLoading = true;
  this.errorMessage = null;
  this.notifications = [];
  this.campeonatoTotais = {}; // Limpa os totais ao recarregar

  const apostador$ = this.apostadorService.getDadosApostador().pipe(
    map(response => {
      if (response.success && response.data) {
        const apostadorData = isPreservedCollection<ApostadorDto>(response.data) ? (response.data.$values && response.data.$values.length > 0 ? response.data.$values[0] : null) : response.data as ApostadorDto;
        if (apostadorData) {
          this.apostadorSaldo = apostadorData.saldo.valor;
        }
        return apostadorData;
      }
      return null;
    }),
    catchError(error => {
      console.error('Erro ao carregar dados do apostador:', error);
      this.showSnackBar('Erro ao carregar seus dados de apostador.', 'Fechar', 'error');
      return of(null);
    })
  );

  const campeonatosDisponiveis$ = apostador$.pipe(
    filter(apostador => !!apostador?.usuarioId),
    switchMap(apostador => this.campeonatoService.getAvailableCampeonatos(apostador!.usuarioId)),
    map(response => {
      if (response.success && response.data) {
        const campeonatos = isPreservedCollection<CampeonatoDto>(response.data) ? response.data.$values : Array.isArray(response.data) ? response.data : [];
        return campeonatos.map(campeonato => ({
          ...campeonato,
          aderidoPeloUsuario: campeonato.aderidoPeloUsuario || false
        }));
      }
      return [];
    }),
    // NOVO: Adicione este `switchMap` para carregar os totais do campeonato
    switchMap(campeonatos => {
      const totaisObservables = campeonatos.map(campeonato => 
        this.apostaService.obterTotaisCampeonato(campeonato.id).pipe(
          map(response => ({ campeonatoId: campeonato.id, totais: response.data })),
          catchError(() => of({ campeonatoId: campeonato.id, totais: null }))
        )
      );
      return forkJoin(totaisObservables).pipe(
        map(totaisArray => {
          // Mapeia os totais para o objeto campeonatoTotais
          totaisArray.forEach(item => {
            if (item.totais) {
              this.campeonatoTotais[item.campeonatoId] = item.totais;
            }
          });
          return campeonatos; // Retorna os campeonatos para o próximo `tap`
        })
      );
    }),
    catchError(error => {
      console.error('Erro ao carregar campeonatos disponíveis:', error);
      this.showSnackBar('Erro ao carregar campeonatos disponíveis.', 'Fechar', 'error');
      return of([]);
    })
  );

  this.subscriptions.add(
    forkJoin([apostador$, campeonatosDisponiveis$]).pipe(
      tap(([apostador, campeonatosDisponiveis]) => {
        this.apostador = apostador;
        this.campeonatosDisponiveis = campeonatosDisponiveis || [];
        console.log('[DashboardComponent] Dados do dashboard carregados:', { apostador, campeonatosDisponiveis });

        const loadRodadasObservables: Observable<any>[] = [];
        this.campeonatosDisponiveis.forEach(campeonato => {
          if (campeonato.aderidoPeloUsuario && campeonato.id) {
            loadRodadasObservables.push(
              forkJoin([
                this.rodadaService.getRodadasEmAposta(campeonato.id).pipe(
                  map(response => response.success && response.data ? (isPreservedCollection<RodadaDto>(response.data) ? response.data.$values : Array.isArray(response.data) ? response.data : []) : []),
                  catchError(error => { console.error(`Erro ao carregar rodadas em aposta para ${campeonato.nome}:`, error); return of([]); })
                ),
                this.rodadaService.getRodadasCorrentes(campeonato.id).pipe(
                  map(response => response.success && response.data ? (isPreservedCollection<RodadaDto>(response.data) ? response.data.$values : Array.isArray(response.data) ? response.data : []) : []),
                  catchError(error => { console.error(`Erro ao carregar rodadas correntes para ${campeonato.nome}:`, error); return of([]); })
                ),
                this.rodadaService.getRodadasFinalizadas(campeonato.id).pipe(
                  map(response => response.success && response.data ? (isPreservedCollection<RodadaDto>(response.data) ? response.data.$values : Array.isArray(response.data) ? response.data : []) : []),
                  catchError(error => { console.error(`Erro ao carregar rodadas finalizadas para ${campeonato.nome}:`, error); return of([]); })
                )
              ]).pipe(
                tap(([rodadasEmAposta, rodadasCorrentes, rodadasFinalizadas]) => {
                  campeonato.rodadasEmAposta = rodadasEmAposta;
                  campeonato.rodadasCorrentes = rodadasCorrentes;
                  campeonato.rodadasFinalizadas = rodadasFinalizadas;
                  
                  // NOVO: Chamada para carregar os totais de apostas avulsas, se houver uma rodada em aposta
                  if (rodadasEmAposta.length > 0) {
                    this.apostaService.obterTotaisApostasAvulsas(rodadasEmAposta[0].id)
                      .pipe(take(1))
                      .subscribe({
                        next: (res) => {
                          if (res.success && res.data) {
                            campeonato.totaisRodadaEmAposta = res.data;
                            console.log('[DashboardComponent] Totais da Rodada em Aposta carregados:', res.data);
                          }
                        },
                        error: (err) => console.error('Erro ao obter totais da rodada em aposta:', err)
                      });
                  }
                  
                  // NOVO: Chamada para carregar os totais de apostas da rodada corrente
                  if (rodadasCorrentes.length > 0) {
                    this.apostaService.obterTotaisApostasAvulsas(rodadasCorrentes[0].id)
                      .pipe(take(1))
                      .subscribe({
                        next: (res) => {
                          if (res.success && res.data) {
                            campeonato.totaisRodadaCorrente = res.data;
                            console.log('[DashboardComponent] Totais da Rodada Corrente carregados:', res.data);
                          }
                        },
                        error: (err) => console.error('Erro ao obter totais da rodada corrente:', err)
                      });
                  }
                })
              )
            );
          }
        });

        if (loadRodadasObservables.length > 0) {
          forkJoin(loadRodadasObservables).subscribe({
            next: () => console.log('[DashboardComponent] Todas as rodadas de campeonatos aderidos carregadas.'),
            error: (err) => console.error('[DashboardComponent] Erro ao carregar rodadas de campeonatos aderidos:', err)
          });
        }
      }),
      catchError(error => {
        console.error('Erro ao carregar dados do dashboard (forkJoin inicial):', error);
        if (error instanceof HttpErrorResponse) {
          console.error('Status:', error.status);
          console.error('Status Text:', error.statusText);
          console.error('URL:', error.url);
          console.error('Error Object:', error.error);
          if (error.status === 401) {
            this.authService.logout();
            this.showSnackBar('Sessão expirada ou inválida. Por favor, faça login novamente.', 'Fechar', 'error');
          }
        }
        this.errorMessage = 'Erro ao carregar dados essenciais do dashboard. Verifique sua conexão e tente novamente.';
        return of([null, []]);
      }),
      finalize(() => {
        this.isLoading = false;
        console.log('[DashboardComponent] Carregamento do dashboard finalizado. isLoading:', this.isLoading);
      })
    ).subscribe()
  );
}

  /**
   * Mapeia o nome do campeonato para o caminho da imagem do logo.
   * @param campeonatoNome O nome do campeonato.
   * @returns O caminho da imagem do logo.
   */
  getCampeonatoLogo(campeonatoNome: string): string {
    const baseImagePath = '/assets/images/';
    switch (campeonatoNome) {
      case 'Campeonato Brasileiro 2025 - 1o Turno':
        return `${baseImagePath}logocampeonatobrasileiroseriea.png`;
      case 'Copa do Mundo de Clubes - FIFA - 2025':
        return `${baseImagePath}logocopamundialdeclubes.png`;
      default:
        return 'https://placehold.co/50x50/cccccc/ffffff?text=ESCUDO'; // Fallback
    }
  }

  /**
   * Tenta fazer o apostador entrar em um campeonato.
   * @param campeonatoId ID do campeonato a aderir.
   */
  entrarEmCampeonato(campeonatoId: string): void {
    if (!this.apostador?.id) {
      this.showSnackBar('Erro: ID do apostador não disponível para entrar no campeonato.', 'Fechar', 'error');
      return;
    }
    
    const request: VincularApostadorCampeonatoDto = { 
      campeonatoId: campeonatoId,
      apostadorId: this.apostador.id
    };
        
    this.campeonatoService.entrarEmCampeonato(request).subscribe({
      next: (response) => {
        if (response.success) {
          this.showSnackBar('Você entrou no campeonato com sucesso!', 'Fechar', 'success');
          this.loadDashboardData();
        } else {
          const errorMessage = response.message || response.errors || 'Erro ao entrar no campeonato.';
          this.showSnackBar(errorMessage, 'Fechar', 'error');
          console.error('Erro ao entrar no campeonato:', response);
        }
      },
      error: (err) => {
        this.showSnackBar('Erro de conexão ao tentar entrar no campeonato.', 'Fechar', 'error');
        console.error('Erro de conexão ao entrar no campeonato:', err);
      }
    });
  }

// NOVO MÉTODO
  carregarTotaisCampeonato(campeonatoId: string): void {
    // Verifica se os totais já foram carregados para evitar chamadas duplicadas
    if (!this.campeonatoTotais[campeonatoId]) {
      this.apostaService.obterTotaisCampeonato(campeonatoId).pipe(
        take(1)
      ).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.campeonatoTotais[campeonatoId] = response.data;
          }
        },
        error: (err) => {
          console.error('Erro ao carregar totais de campeonato', err);
        }
      });
    }
  }


  /**
   * Navega para a página de aposta de rodada para um campeonato e rodada específicos.
   * Agora passa o apostadorCampeonatoId como query parameter.
   * @param campeonatoId ID do campeonato.
   * @param rodadaId ID da rodada.
   */
  navegarParaApostasRodada(campeonatoId: string, rodadaId: string): void {
    
    console.log(`[DashboardComponent] Tentando navegar para apostar na rodada ${rodadaId} do campeonato ${campeonatoId}`);
    console.log('[DashboardComponent] Status de this.apostador:', this.apostador);
    console.log('[DashboardComponent] Conteúdo de campeonatosAderidos:', this.apostador?.campeonatosAderidos);

    if (!this.apostador) {
      this.showSnackBar('Erro: Dados do apostador não carregados.', 'Fechar', 'error');
      return;
    }

    let campeonatosAderidos: ApostadorCampeonatoDto[] = [];
    // Verifica se campeonatosAderidos existe e se é uma PreservedCollection ou um array
    if (this.apostador.campeonatosAderidos) {
      if (isPreservedCollection<ApostadorCampeonatoDto>(this.apostador.campeonatosAderidos)) {
        campeonatosAderidos = this.apostador.campeonatosAderidos.$values || [];
      } else if (Array.isArray(this.apostador.campeonatosAderidos)) {
        campeonatosAderidos = this.apostador.campeonatosAderidos;
      }
    } else {
        console.warn('[DashboardComponent] Nenhum campeonatosAderidos (apostaodorCampeonato) encontrado para o apostador.');
    }

    const apostadorCampeonato = campeonatosAderidos.find(ac => ac.campeonatoId === campeonatoId);

    if (!apostadorCampeonato?.id) {
      this.showSnackBar('Erro: Não foi possível encontrar o ID do seu registro no campeonato para apostar.', 'Fechar', 'error');
      console.error('[DashboardComponent] Erro: apostadorCampeonatoId não encontrado para o campeonato:', campeonatoId, 'Apostador:', this.apostador);
      return;
    }

    console.log(`[DashboardComponent] Navegando com apostadorCampeonatoId: ${apostadorCampeonato.id}`);
    this.router.navigate(
      ['/dashboard/campeonato', campeonatoId, 'apostar-rodada', rodadaId],
      { queryParams: { apostadorCampeonatoId: apostadorCampeonato.id } }
    );
  }
  
  /**
   * Navega para a página de resultados de rodada.
   * @param campeonatoId ID do campeonato.
   * @param rodadaId ID da rodada.
   */
  navegarParaResultadosRodada(campeonatoId: string, rodadaId: string): void {
    console.log(`[DashboardComponent] Tentando navegar para ver resultados da rodada ${rodadaId} do campeonato ${campeonatoId}`);
  
    if (!this.apostador) {
      this.showSnackBar('Erro: Dados do apostador não carregados.', 'Fechar', 'error');
      return;
    }
  
    let campeonatosAderidos: ApostadorCampeonatoDto[] = [];
    if (this.apostador.campeonatosAderidos) {
      if (isPreservedCollection<ApostadorCampeonatoDto>(this.apostador.campeonatosAderidos)) {
        campeonatosAderidos = this.apostador.campeonatosAderidos.$values || [];
      } else if (Array.isArray(this.apostador.campeonatosAderidos)) {
        campeonatosAderidos = this.apostador.campeonatosAderidos;
      }
    }
  
    const apostadorCampeonato = campeonatosAderidos.find(ac => ac.campeonatoId === campeonatoId);
  
    // O apostadorCampeonatoId pode ser nulo se o usuário não aderiu ao campeonato, o que é esperado aqui.
    console.log(`[DashboardComponent] Navegando para resultados com apostadorCampeonatoId: ${apostadorCampeonato?.id || 'null'}`);
  
    this.router.navigate(
      ['dashboard/campeonato', campeonatoId, 'apostar-rodada-resultados', rodadaId],
      { queryParams: { apostadorCampeonatoId: apostadorCampeonato?.id } }
    );
  }

  navegarParaRodadasFinalizadas(campeonatoId: string, rodadaId: string): void {
    console.log(`[DashboardComponent] Tentando navegar para ver rodadas finalizadas ${rodadaId} do campeonato ${campeonatoId}`);
  
    if (!this.apostador) {
      this.showSnackBar('Erro: Dados do apostador não carregados.', 'Fechar', 'error');
      return;
    }
  
    let campeonatosAderidos: ApostadorCampeonatoDto[] = [];
    if (this.apostador.campeonatosAderidos) {
      if (isPreservedCollection<ApostadorCampeonatoDto>(this.apostador.campeonatosAderidos)) {
        campeonatosAderidos = this.apostador.campeonatosAderidos.$values || [];
      } else if (Array.isArray(this.apostador.campeonatosAderidos)) {
        campeonatosAderidos = this.apostador.campeonatosAderidos;
      }
    }
  
    const apostadorCampeonato = campeonatosAderidos.find(ac => ac.campeonatoId === campeonatoId);
  
    // O apostadorCampeonatoId pode ser nulo se o usuário não aderiu ao campeonato, o que é esperado aqui.
    console.log(`[DashboardComponent] Navegando para rodadas finalizadas com apostadorCampeonatoId: ${apostadorCampeonato?.id || 'null'}`);
  
    this.router.navigate(
      ['dashboard/campeonato', campeonatoId, 'rodadas-finalizadas', rodadaId],
      { queryParams: { apostadorCampeonatoId: apostadorCampeonato?.id } }
    );
  }


  /**
   * Navega para a página de depósito.
   */
  navigateToDepositar(): void {
    console.log('[DashboardComponent] Navegando para a página de depósito.');
    this.router.navigate(['/dashboard/financeiro', 'depositar']); // Assumindo uma rota como /financeiro/depositar
  }

  /**
   * Navega para a página de saque.
   */
  navigateToSacar(): void {
    console.log('[DashboardComponent] Navegando para a página de saque.');
    this.router.navigate(['/dashboard/financeiro', 'sacar']); // Assumindo uma rota como /financeiro/sacar
  }

  /**
   * Exibe as rodadas correntes de um campeonato (pode ser um diálogo ou navegação).
   * Por enquanto, apenas loga e mostra um snackbar.
   * @param campeonatoId ID do campeonato.
   */
  verRodadasCorrentes(campeonatoId: string): void {
    console.log(`[DashboardComponent] Ver Rodadas Correntes para o campeonato: ${campeonatoId}`);
    const campeonato = this.campeonatosDisponiveis.find(c => c.id === campeonatoId);
    if (campeonato && campeonato.rodadasCorrentes && campeonato.rodadasCorrentes.length > 0) {
      // Navega para a tela de resultados, passando o ID da primeira rodada corrente
      this.navegarParaResultadosRodada(campeonatoId, campeonato.rodadasCorrentes[0].id);
    } else {
      this.showSnackBar('Nenhuma rodada corrente disponível para visualização.', 'Fechar', 'warning');
    }
  }

  /**
   * Exibe as rodadas finalizadas de um campeonato (pode ser um diálogo ou navegação).
   * Por enquanto, apenas loga e mostra um snackbar.
   * @param campeonatoId ID do campeonato.
   */

  verRodadasFinalizadas(campeonatoId: string): void {
    console.log(`[DashboardComponent] Ver Rodadas Finalizadas para o campeonato: ${campeonatoId}`);
    const campeonato = this.campeonatosDisponiveis.find(c => c.id === campeonatoId);
    if (campeonato && campeonato.rodadasFinalizadas && campeonato.rodadasFinalizadas.length > 0) {
      // Navega para a tela de rodadas resultados, passando o ID da primeira rodada finalizada
      this.navegarParaRodadasFinalizadas(campeonatoId, campeonato.rodadasFinalizadas[0].id);
    } else {
      this.showSnackBar('Nenhuma rodada corrente disponível para visualização.', 'Fechar', 'warning');
    }
  }


  /**
   * Exibe um MatSnackBar com a mensagem e tipo especificados.
   * @param message: A mensagem a ser exibida.
   * @param action: O texto da ação no snackbar.
   * @param type: O tipo de notificação (success, error, warning, info).
   */
  private showSnackBar(message: string, action: string = 'Fechar', type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    let panelClass: string[] = [];
    if (type === 'success') {
      panelClass = ['snackbar-success'];
    } else if (type === 'error') {
      panelClass = ['snackbar-error'];
    } else if (type === 'warning') {
      panelClass = ['snackbar-warning'];
    } else if (type === 'info') {
      panelClass = ['snackbar-info'];
    }

    this.snackBar.open(message, action, {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: panelClass
    });
  }

  // Métodos auxiliares para filtrar rodadas
  getRodadasEmAposta(campeonato: CampeonatoDto): RodadaDto[] {
    return campeonato.rodadasEmAposta || [];
  }

  getRodadasCorrentes(campeonato: CampeonatoDto): RodadaDto[] {
    return campeonato.rodadasCorrentes || [];
  }

  getRodadasFinalizadas(campeonato: CampeonatoDto): RodadaDto[] {
    return campeonato.rodadasFinalizadas || [];
  }
}