import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

// Importe também o modelo se ele existir, ou use 'any'
import { ConferenciaPalpiteDto } from '../../features/relatorios/models/conferencia-palpite-dto.model';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

import { Subscription, combineLatest, of, Observable, forkJoin } from 'rxjs';
import { switchMap, finalize, catchError, filter, tap, map } from 'rxjs/operators';
import { utils, writeFile } from 'xlsx';

// Services & Models
import { RodadaService } from '../../core/services/rodada.service';
import { ApostaService } from '../../core/services/aposta.service';
import { ApostadorService } from '../../core/services/apostador.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-aposta-rodada-resultados-form',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, DatePipe, CurrencyPipe],
  templateUrl: './aposta-rodada-resultados-form.component.html',
  styleUrls: ['./aposta-rodada-resultados-form.component.scss']
})
export class ApostaRodadaResultadosFormComponent implements OnInit, OnDestroy {
  isLoading: boolean = true;
  campeonatoId: string | null = null;
  rodadaId: string | null = null;
  apostadorCampeonatoId: string | null = null;
  userId: string | null = null;
  apostaSelecionadaId: string | null = null;

  rodadasCorrentes: any[] = [];
  rodadaSelecionada: any = null;
  apostasUsuarioRodada: any[] = [];
  apostaAtual: any = null;
  jogosDaApostaAtual: any[] = [];

  baseUrlImagens: string = environment.imagesUrl;
  private subscriptions = new Subscription();

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
      combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
        tap(([params, queryParams]) => {
          this.campeonatoId = params.get('campeonatoId');
          this.rodadaId = params.get('rodadaId');
          this.apostadorCampeonatoId = queryParams.get('apostadorCampeonatoId');
        }),
        filter(() => !!this.campeonatoId && !!this.rodadaId),
        switchMap(() => this.loadAllIntegratedData())
      ).subscribe({
        next: () => this.isLoading = false,
        error: () => this.isLoading = false
      })
    );
  }

  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }

  loadAllIntegratedData(): Observable<any> {
    this.isLoading = true;
    
    // Reset inicial para evitar resquícios visuais de rodadas anteriores
    this.apostasUsuarioRodada = [];
    this.jogosDaApostaAtual = [];
    this.apostaSelecionadaId = null;

    return forkJoin({
      rodadas: this.rodadaService.getRodadasCorrentes(this.campeonatoId!).pipe(
        map(res => (res.data as any)?.$values || res.data || []),
        catchError(() => of([]))
      ),
      apostador: this.apostadorService.getDadosApostador().pipe(
        map(res => res.data),
        catchError(() => of(null))
      ),
      apostas: this.apostaService.obterApostasPorRodada(this.rodadaId!, this.apostadorCampeonatoId).pipe(
  map(res => {
    // 1. Extrai os dados tratando o formato do JSON (com ou sem $values)
    const dados = (res.data as any)?.$values || res.data || [];
    
    // 2. Filtro radical: Só aceita apostas com ID válido e que não seja o GUID vazio
    return dados.filter((a: any) => 
      a.id && a.id !== '00000000-0000-0000-0000-000000000000'
    );
  }),
  catchError(() => of([])) // catchError fica fora do map, tratando o pipe
)
    }).pipe(
      tap(({ rodadas, apostador, apostas }) => {
        this.rodadasCorrentes = rodadas;
        this.rodadaSelecionada = this.rodadasCorrentes.find(r => r.id === this.rodadaId) || this.rodadasCorrentes[0];
        
        if (apostador) {
          this.userId = apostador.id;
        }

        this.apostasUsuarioRodada = apostas;

        // LÓGICA DE TRATAMENTO PARA RODADAS SEM APOSTA (Ex: Jeff na Rodada 1)
        if (this.apostasUsuarioRodada && this.apostasUsuarioRodada.length > 0) {
          // CASO 1: EXISTEM APOSTAS
          // Prioriza a aposta do campeonato, senão pega a primeira da lista
          const inicial = this.apostasUsuarioRodada.find((a: any) => a.ehApostaCampeonato) || this.apostasUsuarioRodada[0];
          this.onApostaSelected(inicial.id);
        } else {
          // CASO 2: NÃO EXISTEM APOSTAS (Modo Consulta Pura)
          this.apostaAtual = null;
          this.apostaSelecionadaId = null; // Garante que nenhuma cartela fantasma seja marcada
          
          // Carrega apenas os jogos e resultados oficiais para o grid
          this.carregarResultadosApenasConsulta().subscribe({
            next: (jogos) => {
              this.jogosDaApostaAtual = jogos;
              this.isLoading = false;
            },
            error: () => {
              this.isLoading = false;
            }
          });
        }
      }),
      // Finaliza o loading caso o fluxo principal termine (com ou sem erro)
      finalize(() => this.isLoading = false)
    );
}

  onApostaSelected(apostaId: string): void {
    this.apostaAtual = this.apostasUsuarioRodada.find((a: any) => a.id === apostaId);
    if (this.apostaAtual) {
      this.apostaService.getApostasComResultados(this.rodadaId!, apostaId).subscribe(res => {
        const data = res.data as any;
        const colecao = data?.jogosComResultados || data;
        this.jogosDaApostaAtual = colecao?.$values || (Array.isArray(colecao) ? colecao : []);
      });
    }
  }

  carregarResultadosApenasConsulta(): Observable<any[]> {
    return this.rodadaService.getJogosByRodada(this.rodadaId!).pipe(
      map((res: any) => {
        const data = res.data?.$values || res.data || [];
        return data.map((j: any) => ({
          equipeMandante: j.equipeCasaNome || j.equipeMandante,
          escudoMandante: j.equipeCasaEscudoUrl || j.escudoMandante,
          equipeVisitante: j.equipeVisitanteNome || j.equipeVisitante,
          escudoVisitante: j.equipeVisitanteEscudoUrl || j.escudoVisitante,
          placarRealCasa: j.placarCasa,
          placarRealVisita: j.placarVisitante,
          statusJogo: j.status || 'Agendado',
          estadioNome: j.estadioNome || j.estadio,
          dataJogo: j.dataHora || j.dataJogo,
          horaJogo: j.horaJogo || '--:--',
          pontuacao: 0
        }));
      })
    );
  }

  // Métodos de Navegação (Recuperados)
  onRodadaSelected(id: string): void {
    this.router.navigate(['/aposta-rodada-resultados', this.campeonatoId, id], {
      queryParams: { apostadorCampeonatoId: this.apostadorCampeonatoId }
    });
  }

  goBackToDashboard(): void { this.router.navigate(['/dashboard']); }

  navegarParaRankingRodada(): void {
    this.router.navigate(['/dashboard/ranking/rodada', this.campeonatoId, this.rodadaId]);
  }

  navegarParaRankingCampeonato(): void {
    this.router.navigate(['/dashboard/ranking/campeonato', this.campeonatoId]);
  }

  extrairDiaSemana(data: string): string {
    if (!data) return '';
    const dias = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
    return dias[new Date(data).getDay()];
  }

// Método chamado pelo botão (click)="onDownloadPlanilhaConferencia()"
  onDownloadPlanilhaConferencia(): void {
    if (!this.rodadaId) return;

    this.rodadaService.obterDadosPlanilhaConferencia(this.rodadaId).subscribe({
      next: (res) => {
        // Trata o retorno com $values (comum em APIs .NET com PreserveReferences)
        const dados = (res as any)?.$values || res;
        
        if (dados && dados.length > 0) {
          this.gerarExcel(dados);
        } else {
          this.snackBar.open('Nenhum dado encontrado para esta planilha.', 'Fechar', { duration: 3000 });
        }
      },
      error: () => this.snackBar.open('Erro ao gerar planilha.', 'Fechar', { duration: 3000 })
    });
  }

  private gerarExcel(dados: any[]): void {
    // Mapeia os dados para colunas amigáveis no Excel
    const worksheetData = dados.map(item => ({
      'Apostador': item.apelidoApostador || item.apelido,
      'Identificação': item.identificadorAposta || 'AVULSA',
      'Jogo': `${item.nomeEquipeCasa || item.equipeMandante} x ${item.nomeEquipeVisita || item.equipeVisitante}`,
      'Palpite': `${item.placarPalpiteCasa ?? item.placarApostaCasa} x ${item.placarPalpiteVisita ?? item.placarApostaVisita}`,
      'Data do Jogo': item.dataJogo ? new Date(item.dataJogo).toLocaleDateString() : ''
    }));

    const ws = utils.json_to_sheet(worksheetData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Conferência de Palpites');

    // Gera o download do arquivo
    const nomeArquivo = `Conferencia_Rodada_${this.rodadaSelecionada?.numeroRodada || this.rodadaId}.xlsx`;
    writeFile(wb, nomeArquivo);
  }

}