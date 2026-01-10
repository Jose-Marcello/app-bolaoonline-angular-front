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
import { ApostaService } from '../../../core/services/aposta.service';
import { ConfirmacaoAdesaoModalComponent } from '../../components/confirmacao-adesao-modal/confirmacao-adesaoModal.component';
import { isPreservedCollection } from '../../../shared/models/api-response.model';

// Modelos
import { CampeonatoDto } from '../../../features/campeonato/models/campeonato-dto.model';
import { RodadaDto } from '../../../features/rodada/model/rodada-dto.model';
import { ApostadorDto } from '../../../features/apostador/models/apostador-dto.model';

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
  
  // Objeto que armazena os totais por ID de campeonato
  campeonatoTotais: { [key: string]: any } = {};
  
  usuarioLogado: boolean = false;

  // Galeria de Marketing
  indiceAtual = 0;
  fotos: string[] = Array.from({ length: 11 }, (_, i) => `assets/marketing/parceiros/EspMar-foto${i + 1}.jpeg`);
  fotoAtual: string = this.fotos[0];
  intervaloGaleria: any;

  // Controle de Arraste (Slider)
  isMouseDown = false;
  startX = 0;
  scrollLeft = 0;

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
      : of({ success: true, data: null });

    inicializarFluxo$.pipe(
      switchMap(() => this.campeonatoService.getAvailableCampeonatos(this.apostador?.usuarioId || '')),
      map(response => unwrap<any[]>(response.data) || []),
      switchMap(campeonatos => {
        this.campeonatosDisponiveis = campeonatos;
        if (campeonatos.length === 0) return of([]);

        const detalhamentoTarefas = campeonatos.map(camp => {
          // Inicialização para evitar erro visual no template
          this.campeonatoTotais[camp.id] = { quantApostadoresVinculados: 0, valorArrecadado: 0, premioAvulsoRodada: 0 };

          return forkJoin({
            emAposta: this.rodadaService.getRodadasEmAposta(camp.id).pipe(catchError(() => of({ success: false, data: [] }))),
            correntes: this.rodadaService.getRodadasCorrentes(camp.id).pipe(catchError(() => of({ success: false, data: [] }))),
            finalizadas: this.rodadaService.getRodadasFinalizadas(camp.id).pipe(catchError(() => of({ success: false, data: [] }))),
            totais: this.usuarioLogado 
                    ? this.apostaService.obterTotaisCampeonato(camp.id).pipe(catchError(() => of({ success: false, data: null })))
                    : of({ success: true, data: null })
          }).pipe(
            tap(res => {
              camp.rodadasEmAposta = unwrap<RodadaDto[]>(res.emAposta?.data) || [];
              camp.rodadasCorrentes = unwrap<RodadaDto[]>(res.correntes?.data) || [];
              camp.rodadasFinalizadas = unwrap<RodadaDto[]>(res.finalizadas?.data) || [];
              
              if (res.totais?.data) {
                const dados = res.totais.data;
                this.campeonatoTotais[camp.id] = {
                  ...dados,
                  // Mapeamento dos campos do Backend C# para o Template
                  quantApostadoresVinculados: dados.quantApostadoresVinculados || 0,
                  valorArrecadado: dados.valorArrecadado || 0,
                  premioAvulsoRodada: dados.premioAvulsoRodada || 0
                };
              }
            })
          );
        });
        return forkJoin(detalhamentoTarefas);
      }),
      finalize(() => { this.isLoading = false; })
    ).subscribe({
      error: () => { this.isLoading = false; }
    });
  }

  // --- MÉTODOS DE APOIO ---
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

  // Lógica do Slider de Campeonatos
  startDragging(e: MouseEvent) {
    this.isMouseDown = true;
    this.startX = e.pageX - this.sliderViewport.nativeElement.offsetLeft;
    this.scrollLeft = this.sliderViewport.nativeElement.scrollLeft;
  }
  stopDragging() { this.isMouseDown = false; }
  moveEvent(e: MouseEvent) {
    if (!this.isMouseDown) return;
    e.preventDefault();
    const x = e.pageX - this.sliderViewport.nativeElement.offsetLeft;
    const walk = (x - this.startX) * 2; 
    this.sliderViewport.nativeElement.scrollLeft = this.scrollLeft - walk;
  }

  // Navegação e Outros
  navigateToDepositar() { this.router.navigate(['/dashboard/financeiro/depositar']); }
  informarEmDesenvolvimento() { this.snackBar.open('Em desenvolvimento!', 'OK', { duration: 3000 }); }
  
  navegarParaApostasRodada(id: string) { /* Lógica de navegação */ }
  verRodadasCorrentes(id: string) { /* Lógica de navegação */ }
  verRodadasFinalizadas(id: string) { /* Lógica de navegação */ }
  abrirModalAdesao(camp: any) { /* Lógica de modal */ }
}