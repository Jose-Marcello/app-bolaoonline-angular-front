import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, combineLatest, of, Observable, forkJoin } from 'rxjs';
import { switchMap, finalize, catchError, filter, tap, map } from 'rxjs/operators';
import { utils, writeFile } from 'xlsx';
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
          const dados = (res.data as any)?.$values || res.data || [];
          return dados.filter((a: any) => a.id && a.id !== '00000000-0000-0000-0000-000000000000');
        }),
        catchError(() => of([]))
      )
    }).pipe(
      tap(({ rodadas, apostador, apostas }) => {
        this.rodadasCorrentes = rodadas;
        this.rodadaSelecionada = this.rodadasCorrentes.find(r => r.id === this.rodadaId) || this.rodadasCorrentes[0];
        if (apostador) this.userId = apostador.id;
        this.apostasUsuarioRodada = apostas;

        if (this.apostasUsuarioRodada.length > 0) {
          const inicial = this.apostasUsuarioRodada.find((a: any) => a.ehApostaCampeonato) || this.apostasUsuarioRodada[0];
          this.onApostaSelected(inicial.id);
        } else {
          this.carregarResultadosApenasConsulta().subscribe(jogos => this.jogosDaApostaAtual = jogos);
        }
      }),
      finalize(() => this.isLoading = false)
    );
  }

  // ✅ MÉTODO RESTAURADO E CORRIGIDO PARA MOSTRAR OS PLACARES
  onApostaSelected(apostaId: string): void {
  this.apostaSelecionadaId = apostaId;
  this.apostaAtual = this.apostasUsuarioRodada.find((a: any) => a.id === apostaId);
  
  if (this.apostaAtual) {
    this.isLoading = true;
    this.apostaService.getApostasComResultados(this.rodadaId!, apostaId).subscribe({
      next: (res) => {
        let listaRaw = res.data?.jogosComResultados || [];
        let totalPontosCartela = 0;

        // ✅ 1. ORDENAÇÃO CRONOLÓGICA (Data + Hora)
        listaRaw.sort((a: any, b: any) => {
          const dataA = (a.dataJogo || '').split('/').reverse().join('-') + ' ' + (a.horaJogo || '00:00');
          const dataB = (b.dataJogo || '').split('/').reverse().join('-') + ' ' + (b.horaJogo || '00:00');
          return dataA.localeCompare(dataB);
        });

        this.jogosDaApostaAtual = listaRaw.map((j: any) => {
          const realCasa = (j.placarRealCasa !== null && j.placarRealCasa !== undefined) ? j.placarRealCasa : null;
          const realVisita = (j.placarRealVisita !== null && j.placarRealVisita !== undefined) ? j.placarRealVisita : null;
          const apCasa = j.placarApostaCasa ?? 0;
          const apVisita = j.placarApostaVisita ?? 0;

          // ✅ 2. REGRA DE PONTUAÇÃO OFICIAL (7-4-3) ESPELHADA DO BACKEND
          let pts = 0;
          if (realCasa !== null && realVisita !== null) {
            if (realCasa === apCasa && realVisita === apVisita) {
              pts = 7; // Placar Exato
            } else if (realCasa === realVisita && apCasa === apVisita) {
              pts = 4; // Empate Correto (Placar Diferente)
            } else if ((realCasa > realVisita && apCasa > apVisita) || (realCasa < realVisita && apCasa < apVisita)) {
              pts = (realCasa === apCasa || realVisita === apVisita) ? 4 : 3; // Vencedor + 1 Placar ou Só Vencedor
            }
          }

          totalPontosCartela += pts;

          return {
            ...j,
            placarRealCasa: realCasa,
            placarRealVisita: realVisita,
            pontuacao: pts,
            statusJogo: j.statusJogo === 'EmAndamento' ? 'AO VIVO' : j.statusJogo
          };
        });

        if (this.apostaAtual) this.apostaAtual.pontuacaoTotalRodada = totalPontosCartela;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }
}

  carregarResultadosApenasConsulta(): Observable<any[]> {
    return this.rodadaService.getJogosByRodada(this.rodadaId!).pipe(
      map((res: any) => {
        const data = res.data?.$values || res.data || [];
        return data.map((j: any) => {
          const partes = (j.dataHora || '').split(' ');
          return {
            equipeMandante: j.equipeCasaNome || j.equipeMandante,
            escudoMandante: j.equipeCasaEscudoUrl || j.escudoMandante,
            equipeVisitante: j.equipeVisitanteNome || j.equipeVisitante,
            escudoVisitante: j.equipeVisitanteEscudoUrl || j.escudoVisitante,
            placarRealCasa: j.placarCasa ?? '-',
            placarRealVisita: j.placarVisitante ?? '-',
            statusJogo: j.status || 'Agendado',
            estadioNome: j.estadioNome || j.estadio,
            dataJogo: partes[0] || '',
            horaJogo: partes[1] ? partes[1].substring(0, 5) : '',
            diaSemana: this.extrairDiaSemana(j.dataHora),
            pontuacao: 0
          };
        });
      })
    );
  }

  extrairDiaSemana(data: string): string {
    if (!data) return '';
    try {
      let dateObj;
      if (data.includes('/')) {
        const [dia, mes, ano] = data.split(' ')[0].split('/');
        dateObj = new Date(Number(ano), Number(mes) - 1, Number(dia));
      } else {
        dateObj = new Date(data);
      }
      const dias = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
      return dias[dateObj.getDay()] || '';
    } catch { return ''; }
  }

  onRodadaSelected(id: string): void {
    this.router.navigate(['/aposta-rodada-resultados', this.campeonatoId, id], {
      queryParams: { apostadorCampeonatoId: this.apostadorCampeonatoId }
    });
  }

  goBackToDashboard(): void { this.router.navigate(['/dashboard']); }
  navegarParaRankingRodada(): void { this.router.navigate(['/dashboard/ranking/rodada', this.campeonatoId, this.rodadaId]); }
  navegarParaRankingCampeonato(): void { this.router.navigate(['/dashboard/ranking/campeonato', this.campeonatoId]); }

  onDownloadPlanilhaConferencia(): void {
    if (!this.rodadaId) return;
    this.rodadaService.obterDadosPlanilhaConferencia(this.rodadaId).subscribe({
      next: (res) => {
        const dados = (res as any)?.$values || res;
        if (dados && dados.length > 0) this.gerarExcel(dados);
        else this.snackBar.open('Nenhum dado encontrado.', 'Fechar', { duration: 3000 });
      },
      error: () => this.snackBar.open('Erro ao gerar planilha.', 'Fechar', { duration: 3000 })
    });
  }

  private gerarExcel(dados: any[]): void {
    const worksheetData = dados.map(item => ({
      'Apostador': item.apelidoApostador || item.apelido,
      'Identificação': item.identificadorAposta || 'AVULSA',
      'Jogo': `${item.nomeEquipeCasa || item.equipeMandante} x ${item.nomeEquipeVisita || item.equipeVisitante}`,
      'Palpite': `${item.placarPalpiteCasa ?? item.placarApostaCasa} x ${item.placarPalpiteVisita ?? item.placarApostaVisita}`,
      'Data do Jogo': item.dataJogo || ''
    }));
    const ws = utils.json_to_sheet(worksheetData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Conferência');
    writeFile(wb, `Conferencia_Rodada_${this.rodadaSelecionada?.numeroRodada || this.rodadaId}.xlsx`);
  }
}