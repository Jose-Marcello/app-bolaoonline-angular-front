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
import { switchMap, finalize, catchError, filter, tap, map } from 'rxjs/operators';
import { utils, writeFile } from 'xlsx';

// Services
import { RodadaService } from '../../core/services/rodada.service';
import { ApostaService } from '../../core/services/aposta.service';
import { AuthService } from '../auth/services/auth.service';

// Models
import { RodadaDto } from '../../features/rodada/model/rodada-dto.model';
import { ApostaRodadaDto } from '../../features/aposta-rodada/models/aposta-rodada-dto.model';
import { ApostaJogoResultadoDto } from '../../features/aposta-rodada/models/aposta-jogo-resultado-dto.model';
import { ConferenciaPalpiteDto } from '../../features/relatorios/models/conferencia-palpite-dto.model';

import { environment } from '../../../environments/environment';

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

  campeonatoId: string | null = null;
  rodadaId: string | null = null;
  apostadorCampeonatoId: string | null = null;

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
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      combineLatest([
        this.route.paramMap,
        this.route.queryParamMap
      ]).pipe(
        tap(([params, queryParams]) => {
          this.campeonatoId = params.get('campeonatoId');
          this.rodadaId = params.get('rodadaId');
          this.apostadorCampeonatoId = queryParams.get('apostadorCampeonatoId');
        }),
        filter(() => !!this.campeonatoId && !!this.rodadaId),
        switchMap(() => this.loadAllIntegratedData())
      ).subscribe({
        next: () => {
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = 'Erro ao carregar dados.';
          this.showSnackBar(this.errorMessage, 'Fechar', 'error');
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadAllIntegratedData(): Observable<any> {
    this.isLoading = true;

    // 1. Carrega Rodadas
    const rodadas$ = this.rodadaService.getRodadasCorrentes(this.campeonatoId!).pipe(
      map(res => (res.data as any)?.$values || res.data || [])
    );
    
    // 2. Carrega Apostas do Usuário
    const apostasDoUsuario$ = this.apostadorCampeonatoId
        //? this.apostaService.getApostasPorRodadaEApostadorCampeonato(this.rodadaId!, this.apostadorCampeonatoId!).pipe(
        ? this.apostaService.obterApostasPorRodada(this.rodadaId!, this.apostadorCampeonatoId!).pipe(
          
            map(res => (res.data as any)?.$values || res.data || []),
            catchError(() => of([]))
          )
        : of([]);

    return combineLatest([rodadas$, apostasDoUsuario$]).pipe(
        tap(([rodadas, apostasList]) => {
            this.rodadasCorrentes = rodadas;
            this.rodadaSelecionada = this.rodadasCorrentes.find(r => r.id === this.rodadaId!) || null;
            this.apostasUsuarioRodada = apostasList;
            
            // Lógica de Seleção Inicial: Prioriza aposta de campeonato
            if (this.apostasUsuarioRodada.length > 0) {
                this.apostaAtual = this.apostasUsuarioRodada.find(a => a.ehApostaCampeonato) || this.apostasUsuarioRodada[0];
            } else {
                this.apostaAtual = null;
            }
        }),
        switchMap(() => {
            // Se tem aposta, carrega resultados COM palpite. Se não, carrega APENAS resultados.
            if (this.apostaAtual) {
                return this.loadResultadosDaApostaAtual(this.apostaAtual.id);
            } else {
                return this.carregarResultadosApenasConsulta();
            }
        }),
        tap(jogos => this.jogosDaApostaAtual = jogos || []),
        finalize(() => this.isLoading = false)
    );
  }

  private loadResultadosDaApostaAtual(apostaRodadaId: string): Observable<ApostaJogoResultadoDto[]> {
    return this.apostaService.getApostasComResultados(this.rodadaId!, apostaRodadaId).pipe(
      map(res => {
        const data = (res.data as any);
        const colecao = data?.jogosComResultados || data;
        return colecao?.$values || (Array.isArray(colecao) ? colecao : []);
      }),
      tap(jogos => console.log(`[Resultados] Modo Apostador: ${jogos.length} jogos carregados.`))
    );
  }

  // NOVO MÉTODO: Para quem não apostou ver apenas os resultados oficiais
  private carregarResultadosApenasConsulta(): Observable<ApostaJogoResultadoDto[]> {
  return this.rodadaService.getJogosByRodada(this.rodadaId!).pipe(
    map((res: any) => { // Tipando o 'res' como any aqui resolve o erro
      const data = res.data?.$values || res.data || [];
      
      return data.map((j: any) => ({
        equipeMandante: j.equipeCasaNome || j.equipeMandante,
        escudoMandante: j.equipeCasaEscudoUrl || j.escudoMandante,
        equipeVisitante: j.equipeVisitanteNome || j.equipeVisitante,
        escudoVisitante: j.equipeVisitanteEscudoUrl || j.escudoVisitante,
        placarRealCasa: j.placarCasa,
        placarRealVisita: j.placarVisitante,
        statusJogo: j.status || 'Finalizado',
        estadioNome: j.estadio,
        dataJogo: j.dataJogo,
        horaJogo: j.horaJogo
      }));
    }),
    tap(() => console.log(`[Resultados] Modo Consulta Ativado.`))
  );
}

  onRodadaSelected(rodadaId: string): void {
    if (this.rodadaSelecionada?.id === rodadaId) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { rodadaId: rodadaId, apostadorCampeonatoId: this.apostadorCampeonatoId },
      queryParamsHandling: 'merge'
    });
    this.rodadaId = rodadaId;
    this.loadAllIntegratedData().subscribe();
  }

  onApostaSelected(apostaId: string): void {
    if (this.apostaAtual?.id === apostaId) return;
    this.apostaAtual = this.apostasUsuarioRodada.find(a => a.id === apostaId) || null;
    if (this.apostaAtual) {
      this.loadResultadosDaApostaAtual(this.apostaAtual.id).subscribe(jogos => this.jogosDaApostaAtual = jogos);
    }
  }

  onDownloadPlanilhaConferencia(): void {
    this.rodadaService.obterDadosPlanilhaConferencia(this.rodadaId!).subscribe({
      next: (res) => {
        const dados = (res as any)?.$values || res;
        if (dados?.length) this.gerarExcel(dados);
      }
    });
  }

  private gerarExcel(dados: ConferenciaPalpiteDto[]): void {
    const ws = utils.json_to_sheet(dados.map(item => ({
      'Apostador': item.apelidoApostador,
      'Identificação': item.identificadorAposta,
      'Jogo': `${item.nomeEquipeCasa} x ${item.nomeEquipeVisita}`,
      'Palpite': `${item.placarPalpiteCasa} x ${item.placarPalpiteVisita}`,
      'Data Jogo': item.dataJogo
    })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Palpites');
    writeFile(wb, `Conferencia_Rodada_${this.rodadaSelecionada?.numeroRodada}.xlsx`);
  }

  goBackToDashboard = () => this.router.navigate(['/dashboard']);
  navegarParaRankingRodada = () => this.router.navigate(['/dashboard/ranking/rodada', this.campeonatoId, this.rodadaId]);
  navegarParaRankingCampeonato = () => this.router.navigate(['/dashboard/ranking/campeonato', this.campeonatoId]);

  private showSnackBar(message: string, action: string, type: string): void {
    this.snackBar.open(message, action, { duration: 4000, panelClass: [`snackbar-${type}`] });
  }
}