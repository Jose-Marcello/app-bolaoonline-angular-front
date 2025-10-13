// src/app/components/aposta-rodada-resultados/aposta-rodada-resultados-form.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';

import { Subscription, combineLatest, of, Observable } from 'rxjs';
import { switchMap, finalize, catchError, filter, tap, map, take } from 'rxjs/operators';
import * as XLSX from 'xlsx';

// Services
import { RodadaService } from '@services/rodada.service';
import { ApostaService } from '@services/aposta.service';
import { CampeonatoService } from '@services/campeonato.service';
import { ApostadorService } from '@services/apostador.service';
import { AuthService } from '@auth/auth.service';

// Models
import { RodadaDto } from '@models/rodada/rodada-dto.model';
import { CampeonatoDto } from '@models/campeonato/campeonato-dto.model';
import { ApostaRodadaDto } from '@models/aposta/aposta-rodada-dto.model';
import { ApostaJogoResultadoDto } from '@models/aposta/aposta-jogo-resultado-dto.model';
import { NotificationDto } from '@models/common/notification.model';
import { ApiResponse, isPreservedCollection, extractCollectionValues } from '@models/common/api-response.model';
import { ApostadorDto } from '@models/apostador/apostador-dto.model';
import { ConferenciaPalpiteDto } from '@models/relatorios/conferencia-palpite-dto.model';

import { environment } from '@environments/environment';

@Component({
  selector: 'app-aposta-rodada-resultados-form',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    DatePipe,
    CurrencyPipe
  ],
  templateUrl: './aposta-rodada-resultados-form.component.html',
  styleUrls: ['./aposta-rodada-resultados-form.component.scss']
})
export class ApostaRodadaResultadosFormComponent implements OnInit, OnDestroy {
  isLoading: boolean = true;
  errorMessage: string | null = null;
  notifications: NotificationDto[] = [];
  hasNotifications: boolean = false;

  campeonatoId: string | null = null;
  rodadaId: string | null = null;

  apostadorCampeonatoId: string | null = null;
  apostaRodadaId: string | null = null;
  userId: string | null = null;
  pontuacaoTotalApostador: number | null = null;

  campeonatoSelecionado: CampeonatoDto | null = null;
  rodadasCorrentes: RodadaDto[] = [];
  rodadaSelecionada: RodadaDto | null = null;
  apostasUsuarioRodada: ApostaRodadaDto[] = [];
  apostaAtual: ApostaRodadaDto | null = null;
  jogosDaApostaAtual: ApostaJogoResultadoDto[] = [];

  baseUrlImagens: string = environment.imagesUrl;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,    
    private rodadaService: RodadaService,
    private apostaService: ApostaService,
    private snackBar: MatSnackBar,
    private apostadorService: ApostadorService,
    private authService: AuthService
  ) {
    console.log('[ApostaRodadaResultadosFormComponent] Constructor: Componente inicializado.');
  }

  ngOnInit(): void {

    this.route.paramMap.subscribe(params => {
      this.campeonatoId = params.get('campeonatoId');
      this.rodadaId = params.get('rodadaId');
    });

    console.log('[ApostaRodadaResultadosFormComponent] ngOnInit: Iniciado.');

    this.subscriptions.add(
      combineLatest([
        this.route.paramMap,
        this.route.queryParamMap
      ]).pipe(
        tap(([params, queryParams]) => {
          this.campeonatoId = params.get('campeonatoId');
          this.rodadaId = params.get('rodadaId');
          this.apostaRodadaId = queryParams.get('apostaRodadaId');
          this.apostadorCampeonatoId = queryParams.get('apostadorCampeonatoId');
          console.log(`[ApostaRodadaResultadosFormComponent] Parâmetros da rota: CampeonatoId=${this.campeonatoId}, RodadaId=${this.rodadaId}, ApostadorCampeonatoId=${this.apostadorCampeonatoId}, ApostaRodadaId=${this.apostaRodadaId}`);
        }),
        filter(() => !!this.campeonatoId && !!this.rodadaId),
        switchMap(() => this.loadAllIntegratedData())
      ).subscribe({
        next: () => {
          this.isLoading = false;
          console.log('[ApostaRodadaResultadosFormComponent] Carregamento inicial de dados concluído.');
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = 'Erro ao carregar dados da rodada ou apostas.';
          console.error('[ApostaRodadaResultadosFormComponent] Erro no carregamento inicial:', err);
          this.showSnackBar(this.errorMessage, 'Fechar', 'error');
        }
      })
    );
  }

  ngOnDestroy(): void {
    console.log('[ApostaRodadaResultadosFormComponent] ngOnDestroy: Desinscrevendo todas as subscriptions.');
    this.subscriptions.unsubscribe();
  }

  private loadAllIntegratedData(): Observable<any> {
    this.isLoading = true;
    this.errorMessage = null;
    this.notifications = [];
    this.hasNotifications = false;

    console.log(`[ApostaRodadaResultadosFormComponent] loadAllIntegratedData - CampeonatoId: ${this.campeonatoId}, RodadaId: ${this.rodadaId}`);

    const rodadas$ = this.rodadaService.getRodadasCorrentes(this.campeonatoId!).pipe(
      map(response => {
        let rodadasExtraidas: any[] = [];
        if (response.success && response.data) {
          rodadasExtraidas = (response.data as any).$values || (Array.isArray(response.data) ? response.data : []);
        }
        return rodadasExtraidas as RodadaDto[];
      })
    );
    
    // A chamada de apostas só ocorre se o apostadorCampeonatoId estiver disponível.
    // Isso suporta o modo "tour".
    const apostasDoUsuario$ = this.apostadorCampeonatoId
        ? this.apostaService.getApostasPorRodadaEApostadorCampeonato(this.rodadaId!, this.apostadorCampeonatoId!).pipe(
            map(response => {
                let apostasExtraidas: any[] = [];
                if (response?.success && response.data) {
                    apostasExtraidas = (response.data as any).$values || (Array.isArray(response.data) ? response.data : []);
                }
                return apostasExtraidas as ApostaRodadaDto[];
            }),
            catchError(error => {
                console.error('[ApostaRodadaResultadosFormComponent] Erro ao carregar lista de apostas. Prosseguindo...', error);
                return of([]);
            })
        )
        : of([]);

    return combineLatest([rodadas$, apostasDoUsuario$]).pipe(
        tap(([rodadas, apostasList]) => {
            this.rodadasCorrentes = rodadas;
            this.rodadaSelecionada = this.rodadasCorrentes.find(r => r.id === this.rodadaId!) || null;
            if (this.rodadaSelecionada) {
                this.campeonatoId = this.rodadaSelecionada.campeonatoId;
            }

            this.apostasUsuarioRodada = apostasList;
            
            if (this.apostasUsuarioRodada.length > 0) {
                let apostaDeCampeonato = this.apostasUsuarioRodada.find(a => a.ehApostaCampeonato === true);
                if (apostaDeCampeonato) {
                    this.apostaAtual = apostaDeCampeonato;
                } else {
                    this.apostaAtual = this.apostasUsuarioRodada[0];
                }
                this.apostaRodadaId = this.apostaAtual.id;
            } else {
                this.apostaAtual = null;
                this.jogosDaApostaAtual = [];
            }
        }),
        switchMap(() => {
            if (this.apostaAtual) {
                return this.loadResultadosDaApostaAtual(this.apostaAtual.id);
            } else {
                return of([]);
            }
        }),
        tap(jogos => {
            if (jogos) {
              this.jogosDaApostaAtual = jogos;
            }
            console.log('[ApostaRodadaResultadosFormComponent] Palpites da aposta atual carregados.');
        }),
        finalize(() => this.isLoading = false),
        catchError(error => {
            this.isLoading = false;
            this.errorMessage = 'Erro ao carregar dados essenciais. Verifique sua conexão e tente novamente.';
            this.showSnackBar(this.errorMessage, 'Fechar', 'error');
            console.error('[ApostaRodadaResultadosFormComponent] Erro em loadAllIntegratedData:', error);
            return of(null);
        })
    );
  }

  private loadResultadosDaApostaAtual(apostaRodadaId: string): Observable<ApostaJogoResultadoDto[]> {
    console.log(`[ApostaRodadaResultadosFormComponent] loadResultadosDaApostaAtual - rodadaId: ${this.rodadaId}, apostaRodadaId: ${apostaRodadaId}`);

    if (!this.rodadaId || !apostaRodadaId) {
      this.showSnackBar('IDs de rodada ou aposta não disponíveis para carregar resultados.', 'Fechar', 'error');
      return of([]);
    }

    return this.apostaService.getApostasComResultados(this.rodadaId!, apostaRodadaId).pipe(
      map(response => {
       if (response?.success && response.data) {
         // Acesse a propriedade 'jogosComResultados' antes de tentar pegar '$values'
         const jogosExtraidos = (response.data as any).jogosComResultados?.$values;
         // Retorna o array extraído, ou um array vazio se o caminho não existir
         return (jogosExtraidos || []) as ApostaJogoResultadoDto[];
       }
        return [];
      }),
      tap(jogos => {
        this.jogosDaApostaAtual = jogos;
        this.showSnackBar('Resultados carregados com sucesso!', 'Fechar', 'success');
      }),
      catchError(error => {
        console.error('[ApostaRodadaResultadosFormComponent] Erro ao carregar jogos da aposta atual:', error);
        return of([]);
      })
    );
  }

  private extractApostadorDto(response: ApiResponse<ApostadorDto | ApostadorDto[]>): ApostadorDto | null {
    if (response.data) {
        if (isPreservedCollection<ApostadorDto>(response.data)) {
            return response.data.$values && response.data.$values.length > 0 ? response.data.$values[0] : null;
        } else {
            return response.data as ApostadorDto;
        }
    }
    return null;
  }

  onRodadaSelected(rodadaId: string): void {
    if (this.rodadaSelecionada?.id === rodadaId) {
      return;
    }
    this.rodadaSelecionada = this.rodadasCorrentes.find(r => r.id === rodadaId) || null;
    if (this.rodadaSelecionada) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { rodadaId: this.rodadaSelecionada.id, apostadorCampeonatoId: this.apostadorCampeonatoId },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
      console.log(`[ApostaRodadaResultadosFormComponent] Rodada ${rodadaId} selecionada. Recarregando dados.`);
      
      this.loadAllIntegratedData().subscribe();
    }
  }

  onApostaSelected(apostaId: string): void {
    if (this.apostaAtual?.id === apostaId) {
      return;
    }
    this.apostaAtual = this.apostasUsuarioRodada.find(a => a.id === apostaId) || null;
    if (this.apostaAtual) {
      console.log(`[ApostaRodadaResultadosFormComponent] Aposta ${apostaId} selecionada. Recarregando resultados.`);
      
      this.loadResultadosDaApostaAtual(this.apostaAtual.id).subscribe({
        next: (jogos) => {
          this.jogosDaApostaAtual = jogos;
          this.showSnackBar('Resultados carregados com sucesso!', 'Fechar', 'success');
        },
        error: () => {
          this.showSnackBar('Erro ao carregar resultados.', 'Fechar', 'error');
        }
      });
    }
  }


  // Método para navegar para o Ranking da Rodada
  navegarParaRankingRodada() {
    if (this.campeonatoId && this.rodadaId) {
      this.router.navigate(['/dashboard/ranking/rodada', this.campeonatoId, this.rodadaId]);
    } else {
      console.error('IDs de Campeonato ou Rodada não encontrados para a navegação.');
      // Opcional: Mostre uma notificação para o usuário
    }
  }

  // Método para navegar para o Ranking do Campeonato
  navegarParaRankingCampeonato() {
    if (this.campeonatoId) {
      this.router.navigate(['/dashboard/ranking/campeonato', this.campeonatoId]);
    } else {
      console.error('ID de Campeonato não encontrado para a navegação.');
      // Opcional: Mostre uma notificação para o usuário
    }
  }
  
onDownloadPlanilhaConferencia(): void {
  // ... seu código de verificação aqui...

  this.rodadaService.obterDadosPlanilhaConferencia(this.rodadaId).subscribe({
    next: (response) => {
      const dados = response?.$values;

      if (dados && dados.length > 0) {
        // AQUI É A NOVA LÓGICA DE ORDENAÇÃO
        const dadosOrdenados = dados.sort((a, b) => {
          // 1. Ordem por Apelido do Apostador
          const apelidoA = a.apelidoApostador?.toLowerCase() || '';
          const apelidoB = b.apelidoApostador?.toLowerCase() || '';
          if (apelidoA !== apelidoB) {
            return apelidoA.localeCompare(apelidoB);
          }

          // 2. Se os apelidos forem iguais, ordene pelo Identificador da Aposta
          const identificadorA = a.identificadorAposta?.toLowerCase() || '';
          const identificadorB = b.identificadorAposta?.toLowerCase() || '';
          if (identificadorA !== identificadorB) {
            return identificadorA.localeCompare(identificadorB);
          }

          // 3. Se os dois campos acima forem iguais, ordene por Data e Hora do Jogo
          const dataHoraJogoA = `${a.dataJogo} ${a.horaJogo}`;
          const dataHoraJogoB = `${b.dataJogo} ${b.horaJogo}`;
          return dataHoraJogoA.localeCompare(dataHoraJogoB);
        });

        this.gerarExcel(dadosOrdenados);
        this.showSnackBar('Planilha gerada com sucesso!', 'Fechar', 'success');
      } else {
        this.showSnackBar('Nenhum dado encontrado para a planilha.', 'Fechar', 'warning');
      }
    },
    error: (err) => {
      this.showSnackBar('Erro ao gerar a planilha. Tente novamente.', 'Fechar', 'error');
      console.error('Erro na requisição da planilha:', err);
    }
  });
}

  private gerarExcel(dados: ConferenciaPalpiteDto[]): void {
  // 1. Defina os cabeçalhos da planilha
  const headers = [
    'Apelido do Apostador',
    'Identificador da Aposta',   
    'Data/Hora do Jogo',
    'Equipe da Casa',
    'Placar Palpite Casa',
    'Placar Palpite Visita',
    'Equipe Visitante',   
    'Data da Aposta',
  ];

  // 2. Mapeie os dados para o formato que a planilha precisa
   const dadosMapeados = dados.map(item => ({
    'Apelido do Apostador': item.apelidoApostador,
    'Identificador da Aposta': item.identificadorAposta,
    'Data/Hora do Jogo': `${item.dataJogo} - ${item.horaJogo}`, // Corrigido aqui
    'Equipe da Casa': item.nomeEquipeCasa,
    'Placar Palpite Casa': item.placarPalpiteCasa,
    'Placar Palpite Visita': item.placarPalpiteVisita,
    'Equipe Visitante': item.nomeEquipeVisita,    
    'Data da Aposta': item.dataHoraEnvio,
  }));

  // 3. Crie a planilha a partir dos dados mapeados
  const ws = XLSX.utils.json_to_sheet(dadosMapeados);
  
  // 4. Crie o nome do arquivo personalizado
  const nomeCampeonato = this.rodadaSelecionada?.campeonato?.nome || 'Campeonato';
  const numeroRodada = this.rodadaSelecionada?.numeroRodada;
  const nomeArquivo = `PlanilhaDePalpites_${nomeCampeonato}_Rodada${numeroRodada}.xlsx`;

  // 5. Crie o workbook e adicione a planilha
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Palpites');

  // 6. Exporte o arquivo
  XLSX.writeFile(wb, nomeArquivo);

  //XLSX.utils.book_append_sheet(wb, ws, 'Conferencia');
  //XLSX.writeFile(wb, `PlanilhaConferencia_${this.rodadaSelecionada?.numeroRodada}.xlsx`);
}

    goBackToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

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
}