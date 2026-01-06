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

import { Subscription, combineLatest, of, Observable, forkJoin } from 'rxjs';
import { switchMap, finalize, catchError, filter, tap, map } from 'rxjs/operators';
import { utils, writeFile } from 'xlsx';

// Services
import { RodadaService } from '../../core/services/rodada.service';
import { ApostaService } from '../../core/services/aposta.service';
import { AuthService } from '../auth/services/auth.service';
import { ApostadorService } from '../../core/services/apostador.service';

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
  apostadorId: string | null = null;
  userId: string | null = null;

  rodadasCorrentes: RodadaDto[] = [];
  rodadaSelecionada: RodadaDto | null = null;
  apostasUsuarioRodada: ApostaRodadaDto[] = [];
  apostaSelecionadaId : string | null = null;
  apostaAtual: ApostaRodadaDto | null = null;
  jogosDaApostaAtual: ApostaJogoResultadoDto[] = [];
  //jogosDaApostaAtual: any[] = [];

  baseUrlImagens: string = environment.imagesUrl;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,    
    private rodadaService: RodadaService,
    private apostaService: ApostaService,
    private apostadorService: ApostadorService,
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

// No loadAllIntegratedData
private loadAllIntegratedData(): Observable<any> {
  this.isLoading = true;

  // REMOVA QUALQUER .subscribe() DE DENTRO DESTE MÉTODO
  return forkJoin({
    rodadas: this.rodadaService.getRodadasCorrentes(this.campeonatoId!).pipe(
      map(res => (res.data as any)?.$values || res.data || []),
      catchError(() => of([]))
    ),
    apostador: this.apostadorService.getDadosApostador().pipe(
      map(res => res.data),
      catchError(() => of(null))
    )
  }).pipe(
    switchMap(({ rodadas, apostador }) => {
      this.rodadasCorrentes = rodadas;
      // Seleciona a Rodada 1 (Status 3 - Final 0086D)
      this.rodadaSelecionada = this.rodadasCorrentes.find((r: any) => r.status === 3) || this.rodadasCorrentes[0];
      this.rodadaId = this.rodadaSelecionada?.id;

      // Chama a busca de apostas - o ZéMarcello agora terá os 12 pontos!
      return this.apostaService.obterApostasPorRodada(this.rodadaId!, this.apostadorCampeonatoId).pipe(
        map(res => (res.data as any)?.$values || res.data || []),
        catchError(() => of([]))
      );
    }),
    tap(apostas => {
      this.apostasUsuarioRodada = apostas;
      if (this.apostasUsuarioRodada.length > 0) {
        // Localiza a cartela C69DABFC97 com os pontos do banco
        this.apostaAtual = this.apostasUsuarioRodada[0];
        this.onApostaSelected(this.apostaAtual.id);
      }
    }),
    finalize(() => this.isLoading = false)
  ); // <--- RETORNA O OBSERVABLE PURO
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

// No método carregarResultadosApenasConsulta(), ajuste o mapeamento:
private carregarResultadosApenasConsulta(): Observable<ApostaJogoResultadoDto[]> {
  return this.rodadaService.getJogosByRodada(this.rodadaId!).pipe(
    map((res: any) => {
      // Garante que pegamos a lista correta do retorno da API
      const data = res.data?.$values || res.data || [];
      
      return data.map((j: any) => ({
        id: j.id || '',
        idJogo: j.id || '', // No modo consulta, o ID do palpite é o próprio ID do jogo
        equipeMandante: j.equipeCasaNome || j.equipeMandante || '',
        siglaMandante: j.siglaCasa || '',
        escudoMandante: j.equipeCasaEscudoUrl || j.escudoMandante || '',
        equipeVisitante: j.equipeVisitanteNome || j.equipeVisitante || '',
        siglaVisitante: j.siglaVisitante || '',
        escudoVisitante: j.equipeVisitanteEscudoUrl || j.escudoVisitante || '',
        placarRealCasa: j.placarCasa !== undefined ? j.placarCasa : j.placarRealCasa,
        placarRealVisita: j.placarVisitante !== undefined ? j.placarVisitante : j.placarRealVisita,
        estadioNome: j.estadioNome || j.estadio || 'ESTÁDIO NÃO INFORMADO',
        dataJogo: j.dataHora || j.dataJogo, // Fonte da data
        // O erro na 118 geralmente é aqui. Usamos uma verificação segura:
        horaJogo: (j.dataHora || j.dataJogo) 
                   ? new Date(j.dataHora || j.dataJogo).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                   : '--:--',
        statusJogo: j.status || 'Agendado',
        placarApostaCasa: null, // Usuário não apostou
        placarApostaVisita: null, // Usuário não apostou
        pontuacao: 0
      }));
    }),
    tap(jogos => console.log('[Resultados] Modo Consulta:', jogos))
  );
}
  

  onRodadaSelected(rodadaId: string): void {
  if (this.rodadaId === rodadaId) return;
  this.rodadaId = rodadaId;
  this.apostaAtual = null; // Limpa para forçar nova identificação
  this.loadAllIntegratedData().subscribe();
}
  onApostaSelected(apostaId: string): void {
  this.apostaSelecionadaId = apostaId; // Atualiza o ID para o destaque visual
  this.apostaAtual = this.apostasUsuarioRodada.find(a => a.id === apostaId) || null;

  if (this.apostaAtual) {
    this.isLoading = true;
    // IMPORTANTE: Busca os confrontos vinculados a esta cartela específica
    this.loadResultadosDaApostaAtual(this.apostaAtual.id).subscribe({
      next: (jogos) => {
        this.jogosDaApostaAtual = jogos;
        console.log('Jogos da aposta carregados:', this.jogosDaApostaAtual);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.showSnackBar('Erro ao carregar confrontos.', 'Fechar', 'error');
      }
    });
  }
}

extrairDiaSemana(data: string): string {
  if (!data) return '';
  
  // Se a data vier como "05/04", precisamos garantir que o JS entenda o ano
  // Ou, se você mudou o backend para enviar a data completa, melhor ainda.
  const partes = data.split('/');
  const hoje = new Date();
  const dataFormatada = new Date(hoje.getFullYear(), parseInt(partes[1]) - 1, parseInt(partes[0]));
  
  const dias = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  return dias[dataFormatada.getDay()];
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