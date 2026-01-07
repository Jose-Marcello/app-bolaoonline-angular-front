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
import { MatDialog } from '@angular/material/dialog';

// Serviços e Modelos
import { AuthService } from '../../../features/auth/services/auth.service';
import { CampeonatoService } from '../../../core/services/campeonato.service';
import { RodadaService } from '../../../core/services/rodada.service';
import { ApostadorService } from '../../../core/services/apostador.service';
import { ApostaService } from '../../../core/services/aposta.service';
import { ConfirmacaoAdesaoModalComponent } from '../../components/confirmacao-adesao-modal/confirmacao-adesaoModal.component';

import { CampeonatoDto } from '../../../features/campeonato/models/campeonato-dto.model';
import { RodadaDto } from '../../../features/rodada/model/rodada-dto.model';
import { ApostadorDto } from '../../../features/apostador/models/apostador-dto.model';
import { ApostadorCampeonatoDto } from '../../../features/apostador-campeonato/models/apostador-campeonato-dto.model';
import { VincularApostadorCampeonatoDto } from '../../../features/campeonato/models/vincular-apostador-campeonato.model';
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

  usuarioLogado: boolean = false;

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
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}


  ngOnInit(): void {
  // 1. Define o estado inicial baseado no token
  this.usuarioLogado = this.authService.estaLogado(); 
  this.iniciarCarrossel();

  // 2. Carrega os dados IMEDIATAMENTE. 
  // O seu loadDashboardData já sabe lidar com o fato de ser logado ou visitante.
  this.loadDashboardData();

  // 3. Mantém o subscribe apenas para reagir a mudanças (ex: login feito em outra aba)
  this.subscriptions.add(
    this.authService.isAuthenticated$.subscribe(status => {
      // Só recarrega se o status mudar para diferente do que já detectamos
      if (status !== this.usuarioLogado) {
        this.usuarioLogado = status;
        this.loadDashboardData();
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
  }

  loadDashboardData(): void {
  this.isLoading = true;

  // 1. Definimos o fluxo inicial: Se logado, busca dados do apostador. Se não, retorna um "vazio" de sucesso.
  const inicializarFluxo$ = this.usuarioLogado 
    ? this.apostadorService.getDadosApostador().pipe(
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
        })
      )
    : of({ success: true, data: null }); // Atalho para Visitante

  inicializarFluxo$.pipe(
    // 2. Busca campeonatos: Se não tem ID (visitante), passa string vazia para trazer a vitrine geral
    switchMap(() => this.campeonatoService.getAvailableCampeonatos(this.apostador?.usuarioId || '')),
    map(response => unwrap<CampeonatoDto[]>(response.data) || []),
    
    switchMap(campeonatos => {
      this.campeonatosDisponiveis = campeonatos;
      if (campeonatos.length === 0) return of([]);

      // 3. Bateria de chamadas paralelas (Vitrine Pública)
      const detalhamentoTarefas = campeonatos.map(camp => 
        forkJoin({
          emAposta: this.rodadaService.getRodadasEmAposta(camp.id).pipe(catchError(() => of({ success: false, data: [] }))),
          correntes: this.rodadaService.getRodadasCorrentes(camp.id).pipe(catchError(() => of({ success: false, data: [] }))),
          finalizadas: this.rodadaService.getRodadasFinalizadas(camp.id).pipe(catchError(() => of({ success: false, data: [] }))),
          // Totais só fazem sentido se houver um apostador logado para comparar
          totais: this.usuarioLogado 
                  ? this.apostaService.obterTotaisCampeonato(camp.id).pipe(catchError(() => of({ success: false, data: null })))
                  : of({ success: true, data: null })
        }).pipe(
          tap(res => {
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

  // No seu dashboard.component.ts
// No seu dashboard.component.ts

abrirModalAdesao(camp: CampeonatoDto): void {

  // 1. Trava de Segurança para Visitante
  if (!this.authService.estaLogado()) {
    this.snackBar.open('🏆 Gostou deste campeonato? Crie sua conta para participar!', 'CADASTRAR', {
      duration: 5000,
      panelClass: ['snackbar-info']
    }).onAction().subscribe(() => {
      this.router.navigate(['/auth/register']);
    });
    return; // Aborta antes de abrir qualquer modal
  }

  // 2. Abre a nova modal estilizada em vez do confirm() do navegador
  const dialogRef = this.dialog.open(ConfirmacaoAdesaoModalComponent, {
    width: '350px',
    data: { campeonatoNome: camp.nome },
    panelClass: 'custom-modal-panel' // Classe para remover fundos padrão se necessário
  });

  // 2. Escuta o fechamento da modal
  dialogRef.afterClosed().subscribe(confirmado => {
    if (confirmado) {
      this.isLoading = true;

      // Monta o request com os IDs necessários
      const request: VincularApostadorCampeonatoDto = {
        campeonatoId: camp.id,
        apostadorId: this.apostador?.id || ''
      };

      // 3. Executa a adesão real no banco
      this.campeonatoService.entrarEmCampeonato(request).pipe(
        finalize(() => this.isLoading = false)
      ).subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open('🎯 Inscrição Confirmada! Boa sorte!', 'OK', { duration: 5000 });
            this.loadDashboardData(); // Atualiza saldo e status
          } else {
            const msg = response.errors?.$values?.[0] || 'Erro na adesão.';
            this.snackBar.open(msg, 'Fechar', { duration: 5000 });
          }
        },
        error: () => this.snackBar.open('Erro de conexão.', 'Fechar', { duration: 4000 })
      });
    }
  });
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

convidarParaCadastro(): void {
  // 1. Exibe um convite visual no padrão do sistema
  this.snackBar.open('🚀 Crie sua conta grátis para começar a palpitar!', 'CADASTRAR', {
    duration: 6000,
    horizontalPosition: 'center',
    verticalPosition: 'bottom',
    panelClass: ['snackbar-premium-indigo'] // Aquela classe estilizada que criamos
  }).onAction().subscribe(() => {
    // 2. Redireciona para a tela de registro se o usuário clicar no botão do SnackBar
    this.router.navigate(['/auth/register']);
  });

  // 3. Opcional: Se você não quiser o SnackBar e preferir ir direto:
  // this.router.navigate(['/auth/register']);
}

  navigateToDepositar() { this.router.navigate(['/dashboard/financeiro/depositar']); }
  informarEmDesenvolvimento() { this.showSnackBar('Em desenvolvimento!', 'OK', 'info'); }
}