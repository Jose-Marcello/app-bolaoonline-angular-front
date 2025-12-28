import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, FormsModule, Validators, ReactiveFormsModule } from '@angular/forms';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { Subscription, combineLatest, of, Observable } from 'rxjs';
import { switchMap, finalize, catchError, filter, tap, map } from 'rxjs/operators';

// Services
import { RodadaService } from '../../core/services/rodada.service';
import { ApostaService } from '../../core/services/aposta.service';
import { CampeonatoService } from '../../core/services/campeonato.service';
import { ApostadorService } from '../../core/services/apostador.service';
import { AuthService } from '../auth/services/auth.service';

// Models
import { RodadaDto } from '../../features/rodada/model/rodada-dto.model';
import { ApostaRodadaDto } from '../../features/aposta-rodada/models/aposta-rodada-dto.model';
import { ApostaJogoEdicaoDto } from '../../features/aposta-rodada/models/aposta-jogo-edicao-dto.model';
import { SalvarApostaRequestDto, ApostaJogoRequest } from '../../features/aposta-rodada/models/salvar-aposta-request-dto.model';
import { ApiResponse, isPreservedCollection } from '../../shared/models/api-response.model';
import { ApostadorDto } from '../../features/apostador/models/apostador-dto.model';
import { CriarApostaAvulsaRequestDto } from '../../features/aposta-rodada/models/criar-aposta-avulsa-request.Dto.model'; 

import { environment } from '../../../environments/environment';
import { ConfirmacaoApostaModalComponent } from '../../shared/components/confirmacao-modal/confirmacao-apostaModal.Component';

@Component({
  selector: 'app-aposta-rodada-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatCardModule, MatButtonModule, 
    MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, 
    MatFormFieldModule, MatInputModule, DatePipe, CurrencyPipe, MatDialogModule //
  ],
  templateUrl: './aposta-rodada-form.component.html',
  styleUrls: ['./aposta-rodada-form.component.scss']
})
export class ApostaRodadaFormComponent implements OnInit, OnDestroy {
  isLoading: boolean = true;
  isSaving: boolean = false;
  isLoadingPalpites: boolean = false;
  isReadOnly: boolean = true; 
  errorMessage: string | null = null;

  campeonatoId: string | null = null;
  rodadaId: string | null = null;
  apostadorCampeonatoId: string | null = null;
  apostaRodadaId: string | null = null;
  rodadaSelecionadaId: string | null = null;
  userId: string | null = null;

  apostadorSaldo: number | null = null;
  custoAposta: number = 0;
  isApostadorReady: boolean = false;

  rodadasEmAposta: RodadaDto[] = [];
  rodadaSelecionada: RodadaDto | null = null;
  apostasUsuarioRodada: ApostaRodadaDto[] = []; 
  jogosDaApostaAtual: ApostaJogoEdicaoDto[] = [];
  apostaAtual: any = null;

  apostaForm!: FormGroup;
  baseUrlImagens: string = environment.imagesUrl;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private rodadaService: RodadaService,
    private apostaService: ApostaService,
    private apostadorService: ApostadorService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.apostaForm = this.fb.group({
      palpites: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.subscriptions.add(
      combineLatest([
        this.route.paramMap,
        this.route.queryParamMap
      ]).pipe(
        tap(([params, queryParams]) => {
          this.campeonatoId = params.get('campeonatoId');
          this.rodadaId = params.get('rodadaId');
          this.apostaRodadaId = params.get('apostaRodadaId');
          this.apostadorCampeonatoId = queryParams.get('apostadorCampeonatoId');
          this.rodadaSelecionadaId = this.rodadaId;
        }),
        filter(() => !!this.campeonatoId && !!this.rodadaId),
        switchMap(() => this.loadAllIntegratedData())
      ).subscribe({
        next: () => this.isLoading = false,
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'Erro ao carregar dados da rodada ou apostas.';
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
    
    const rodadas$ = this.rodadaService.getRodadasEmAposta(this.campeonatoId!).pipe(
        map(response => {
            const data = response.data as any;
            let rodadas = response.success && data ? (data['$values'] || data) : [];
            return rodadas as RodadaDto[];
        })
    );

    const apostasDoUsuario$ = this.apostadorCampeonatoId
        ? this.apostaService.getApostasPorRodadaEApostadorCampeonato(this.rodadaId!, this.apostadorCampeonatoId!).pipe(
            map(response => {
                const data = response?.data as any;
                return response?.success && data ? (data['$values'] || data) : [];
            }),
            catchError(() => of([]))
        )
        : of([]);

    const apostador$ = this.apostadorService.getDadosApostador().pipe(
        map(response => response.data as ApostadorDto)
    );

    return combineLatest([rodadas$, apostador$, apostasDoUsuario$]).pipe(
        tap(([rodadas, apostador, apostasList]) => {
            this.rodadasEmAposta = rodadas;
            this.rodadaSelecionada = this.rodadasEmAposta.find(r => r.id === this.rodadaId!) || null;
            if (this.rodadaSelecionada) this.custoAposta = this.rodadaSelecionada.custoApostaRodada;

            if (apostador) {
                this.userId = apostador.id;
                this.apostadorSaldo = apostador.saldo?.valor || 0;
                this.isApostadorReady = true;
            }

            this.apostasUsuarioRodada = apostasList;
            
            if (this.apostasUsuarioRodada.length > 0) {
                const campeonato = this.apostasUsuarioRodada.find(a => a.ehApostaCampeonato);
                this.apostaAtual = campeonato ? campeonato : this.apostasUsuarioRodada[0];
                this.isReadOnly = false;
            } else {
                this.isReadOnly = true;
                this.apostaAtual = null;
            }
        }),
        switchMap(() => {
            if (this.apostaAtual && this.apostaAtual.id) {
                return this.loadJogosDaApostaAtual(this.apostaAtual.id);
            } else {
                return this.rodadaService.getJogosByRodada(this.rodadaId!).pipe(
                  tap(jogos => {
                    const data = (jogos as any).data;
                    this.jogosDaApostaAtual = data ? (data['$values'] || data) : (jogos as any);
                    this.montarGridVazio();
                  })
                );
            }
        })
    );
  }

  onRodadaSelected(rodadaId: string) {
    this.rodadaSelecionadaId = rodadaId;
    this.rodadaId = rodadaId;
    this.apostaAtual = null; 
    this.isReadOnly = true; 

    this.isLoadingPalpites = true;
    this.rodadaService.getJogosByRodada(rodadaId).subscribe({
      next: (res: any) => {
        const data = res.data;
        this.jogosDaApostaAtual = data ? (data['$values'] || data) : res;
        this.montarGridVazio();
        this.isLoadingPalpites = false;
        this.recarregarApostasDaRodada(rodadaId);
      },
      error: () => this.isLoadingPalpites = false
    });
  }

  private recarregarApostasDaRodada(rodadaId: string) {
    if(!this.apostadorCampeonatoId) return;
    this.apostaService.getApostasPorRodadaEApostadorCampeonato(rodadaId, this.apostadorCampeonatoId)
      .subscribe(res => {
        const data = res.data as any;
        this.apostasUsuarioRodada = data ? (data['$values'] || data) : [];
        if(this.apostasUsuarioRodada.length > 0) {
          this.onApostaSelected(this.apostasUsuarioRodada[0].id!);
        }
      });
  }

  onApostaSelected(apostaId: string) {
  if (!apostaId) return;

  // 1. Inicia o loading e reseta o formulário atual para evitar "sujeira" visual
  this.isLoadingPalpites = true;
  this.palpites.clear(); // Limpa o FormArray imediatamente

  // 2. Busca os detalhes da nova aposta clicada
  this.apostaService.getApostaById(apostaId).subscribe({
    next: (res: any) => {
      // Ajuste para garantir que pegamos o objeto correto (com ou sem $values)
      this.apostaAtual = res.data || res;
      this.isReadOnly = false; // Habilita o grid de palpites para edição
      
      // 3. Carrega os palpites específicos desta nova aposta
      this.loadJogosDaApostaAtual(apostaId).subscribe({
        complete: () => {
          this.isLoadingPalpites = false;
          console.log(`[Aposta Selecionada] ID: ${this.apostaAtual.id} - ${this.apostaAtual.identificadorAposta}`);
        }
      });
    },
    error: (err) => {
      console.error('Erro ao selecionar aposta:', err);
      this.isLoadingPalpites = false;
      this.showSnackBar('Erro ao carregar os dados da aposta.', 'Fechar', 'error');
    }
  });
}

  private loadJogosDaApostaAtual(apostaRodadaId: string): Observable<ApostaJogoEdicaoDto[]> {
    return this.apostaService.getApostasParaEdicao(this.rodadaId!, apostaRodadaId).pipe(
        map(res => isPreservedCollection<ApostaJogoEdicaoDto>(res.data) ? (res.data as any).$values : res.data as ApostaJogoEdicaoDto[]),
        tap(jogos => {
            this.jogosDaApostaAtual = jogos;
            this.preencherFormularioComPalpites();
        })
    );
  }

  preencherFormularioComPalpites(): void {
    this.palpites.clear();
    this.jogosDaApostaAtual.forEach(jogo => {
      this.palpites.push(this.fb.group({
        idJogo: [jogo.idJogo, Validators.required],
        placarApostaCasa: [jogo.placarApostaCasa, [Validators.required, Validators.min(0)]],
        placarApostaVisita: [jogo.placarApostaVisita, [Validators.required, Validators.min(0)]]
      }));
    });
  }

  montarGridVazio() {
    this.palpites.clear();
    this.jogosDaApostaAtual.forEach(jogo => {
      this.palpites.push(this.fb.group({
        idJogo: [jogo.id],
        placarApostaCasa: [{ value: null, disabled: true }], 
        placarApostaVisita: [{ value: null, disabled: true }]
      }));
    });
  }

  get palpites(): FormArray {
    return this.apostaForm.get('palpites') as FormArray;
  }

  salvarApostas(): void {
    if (this.apostaForm.invalid || !this.apostaAtual) return;

    this.isSaving = true;
    const request: SalvarApostaRequestDto = {
      id: this.apostaAtual.id,
      campeonatoId: this.campeonatoId!,
      rodadaId: this.rodadaId!,
      apostadorCampeonatoId: this.apostadorCampeonatoId!,
      identificadorAposta: this.apostaAtual.identificadorAposta,
      ehApostaIsolada: this.apostaAtual.ehApostaIsolada,
      apostasJogos: this.palpites.controls.map(c => ({
        jogoId: c.get('idJogo')?.value,
        placarCasa: c.get('placarApostaCasa')?.value,
        placarVisitante: c.get('placarApostaVisita')?.value
      })),
      ehCampeonato: this.apostaAtual.ehApostaCampeonato
    };

    this.apostaService.salvarApostas(request).pipe(
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.showSnackBar('Apostas salvas!', 'Fechar', 'success');
          this.apostaForm.markAsPristine();
        }
      }
    });
  }

  onClickCriarNovaAposta(): void {
    this.dialog.open(ConfirmacaoApostaModalComponent, {
        data: { mensagem: `Deseja criar uma nova aposta avulsa?`, valorAposta: this.custoAposta }
    }).afterClosed().subscribe(result => {
        if (result) this.criarNovaApostaAvulsa();
    });
  }

  criarNovaApostaAvulsa(): void {
    const request: CriarApostaAvulsaRequestDto = {
      campeonatoId: this.campeonatoId!,
      rodadaId: this.rodadaId!,
      apostadorId: this.userId!,
      custoAposta: this.custoAposta
    };
    this.apostaService.criarNovaApostaAvulsa(request).subscribe(res => {
      if (res.success) {
        this.showSnackBar('Nova aposta criada!', 'Fechar', 'success');
        this.loadAllIntegratedData().subscribe();
      }
    });
  }

  goBackToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  private showSnackBar(message: string, action: string, type: string): void {
    this.snackBar.open(message, action, { duration: 3000, panelClass: [`snackbar-${type}`] });
  }
}