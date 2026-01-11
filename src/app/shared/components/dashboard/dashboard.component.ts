import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription, of, forkJoin } from 'rxjs';
import { finalize, tap, switchMap, catchError, map } from 'rxjs/operators';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

// Core & Shared
import { AuthService } from '../../../features/auth/services/auth.service';
import { CampeonatoService } from '../../../core/services/campeonato.service';
import { RodadaService } from '../../../core/services/rodada.service';
import { ApostadorService } from '../../../core/services/apostador.service';
import { ConfirmacaoAdesaoModalComponent } from '../../components/confirmacao-adesao-modal/confirmacao-adesaoModal.component';
import { isPreservedCollection } from '../../../shared/models/api-response.model';

// Modelos
import { ApostadorDto } from '../../../features/apostador/models/apostador-dto.model';
import { RodadaDto } from '../../../features/rodada/model/rodada-dto.model';
import { ApostasCampeonatoTotaisDto } from '../../../features/campeonato/models/apostas-campeonato-totais-dto.model';

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
  @ViewChild('sliderViewport') sliderViewport!: ElementRef;

  isLoading: boolean = true;
  apostador: ApostadorDto | null = null;
  apostadorSaldo: number | null = null;
  campeonatosDisponiveis: any[] = [];
  usuarioLogado: boolean = false;
  
  // Dicionário para armazenar os totais de cada campeonato no slider
  campeonatoTotais: { [key: string]: ApostasCampeonatoTotaisDto } = {};

  // Galeria Marketing
  indiceAtual = 0;
  fotos: string[] = Array.from({ length: 11 }, (_, i) => `assets/marketing/parceiros/EspMar-foto${i + 1}.jpeg`);
  fotoAtual: string = this.fotos[0];
  intervaloGaleria: any;

  // Slider Mouse Drag
  isMouseDown = false;
  startX = 0;
  scrollLeft = 0;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private campeonatoService: CampeonatoService,
    private rodadaService: RodadaService,
    private apostadorService: ApostadorService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.usuarioLogado = this.authService.estaLogado(); 
    this.iniciarCarrossel();
    this.loadDashboardData();

    this.subscriptions.add(
      this.authService.isAuthenticated$.subscribe(status => {
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

  loadDashboardData(): void {
    this.isLoading = true;
    
    // 1. Busca dados do apostador se logado
    const inicializarFluxo$ = this.usuarioLogado 
      ? this.apostadorService.getDadosApostador().pipe(
          catchError(() => of({ success: false, data: null })),
          tap(response => {
            if (response?.success && response.data) {
              const data = unwrap<ApostadorDto>(response.data);
              if (data) {
                this.apostador = data;
                this.apostadorSaldo = data.saldo?.valor || 0;
              }
            }
          })
        )
      : of({ success: true, data: null });

    // 2. Busca campeonatos e depois seus detalhes em paralelo
    inicializarFluxo$.pipe(
      switchMap(() => this.campeonatoService.getAvailableCampeonatos(this.apostador?.usuarioId || '')),
      map(response => unwrap<any[]>(response.data) || []),
      switchMap(campeonatos => {
        this.campeonatosDisponiveis = campeonatos;
        if (campeonatos.length === 0) return of([]);

        const detalhamentoTarefas = campeonatos.map(camp => {
          return forkJoin({
            emAposta: this.rodadaService.getRodadasEmAposta(camp.id).pipe(catchError(() => of({ success: false, data: [] }))),
            correntes: this.rodadaService.getRodadasCorrentes(camp.id).pipe(catchError(() => of({ success: false, data: [] }))),
            finalizadas: this.rodadaService.getRodadasFinalizadas(camp.id).pipe(catchError(() => of({ success: false, data: [] }))),
            // CHAMA O NOVO MÉTODO DO CONTROLLER C#
            totais: this.campeonatoService.obterTotaisDashboard(camp.id).pipe(catchError(() => of({ success: false, data: null })))
          }).pipe(
            tap(res => {
              camp.rodadasEmAposta = unwrap<RodadaDto[]>(res.emAposta?.data) || [];
              camp.rodadasCorrentes = unwrap<RodadaDto[]>(res.correntes?.data) || [];
              camp.rodadasFinalizadas = unwrap<RodadaDto[]>(res.finalizadas?.data) || [];
              
              if (res.totais?.success && res.totais.data) {
                // Alimenta o dicionário com os nomes de campos corretos da Interface
                this.campeonatoTotais[camp.id] = res.totais.data;
              }
            })
          );
        });
        return forkJoin(detalhamentoTarefas);
      }),
      finalize(() => { this.isLoading = false; })
    ).subscribe({
      error: (err) => { 
        console.error('Erro ao carregar dashboard:', err);
        this.isLoading = false; 
      }
    });
  }

  navegarParaApostasRodada(campeonatoId: string) {
    const camp = this.campeonatosDisponiveis.find(c => c.id === campeonatoId);
    if (camp && camp.rodadasEmAposta?.length > 0) {
      const rodadaId = camp.rodadasEmAposta[0].id;
      this.router.navigate(['/apostas-rodada', campeonatoId, rodadaId]);
    } else {
      this.snackBar.open('Não há rodadas abertas para este campeonato.', 'OK', { duration: 3000 });
    }
  }

  verRodadasCorrentes(campeonatoId: string) {
    const camp = this.campeonatosDisponiveis.find(c => c.id === campeonatoId);
    if (camp && camp.rodadasCorrentes?.length > 0) {
      const rodadaId = camp.rodadasCorrentes[0].id;
      this.router.navigate(['/apostas-resultados', campeonatoId, rodadaId]);
    } else {
      this.snackBar.open('Não há resultados parciais disponíveis no momento.', 'OK', { duration: 3000 });
    }
  }

  verRodadasFinalizadas(campeonatoId: string) {
    this.router.navigate(['/dashboard/ranking/campeonato', campeonatoId]);
  }

  navegarParaRegras() {
    this.router.navigate(['/dashboard/regrasDoBolao']);
  }
  
  abrirModalAdesao(camp: any) {
    if (!this.usuarioLogado) { this.router.navigate(['/auth/login']); return; }
    const dialogRef = this.dialog.open(ConfirmacaoAdesaoModalComponent, {
      width: '400px',
      data: { campeonato: camp, apostador: this.apostador }
    });
    dialogRef.afterClosed().subscribe(result => { if (result) this.loadDashboardData(); });
  }

  getCampeonatoLogo(nome: string): string {
    const logos: { [key: string]: string } = {
      'Campeonato Brasileiro 2025 - 1o Turno': 'assets/images/logocampeonatobrasileiro_2025.png',
      'Campeonato Brasileiro 2026 - 1o Turno': 'assets/images/logocampeonatobrasileiro_2026.png',
      'Copa do Mundo de Clubes - FIFA - 2025': 'assets/images/logocopamundialdeclubes.png'
    };
    return logos[nome] || 'assets/images/logo-bola.png';
  }

  iniciarCarrossel() {
    this.intervaloGaleria = setInterval(() => {
      this.indiceAtual = (this.indiceAtual + 1) % this.fotos.length;
      this.fotoAtual = this.fotos[this.indiceAtual];
    }, 4000);
  }

  // Slider Mouse Drag corrigido para usar sliderViewport
  startDragging(e: MouseEvent) {
    this.isMouseDown = true;
    const slider = e.currentTarget as HTMLElement;
    this.startX = e.pageX - slider.offsetLeft;
    this.scrollLeft = slider.scrollLeft;
  }

  stopDragging() { this.isMouseDown = false; }

  moveEvent(e: MouseEvent) {
    if (!this.isMouseDown) return;
    e.preventDefault();
    const slider = e.currentTarget as HTMLElement;
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - this.startX) * 2; 
    slider.scrollLeft = this.scrollLeft - walk;
  }

  navigateToDepositar() { this.router.navigate(['/dashboard/financeiro/depositar']); }
  informarEmDesenvolvimento() { this.snackBar.open('Em desenvolvimento!', 'OK', { duration: 3000 }); }
}