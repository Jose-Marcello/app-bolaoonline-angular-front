import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';

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
import { switchMap, finalize, catchError, filter, tap, take, map } from 'rxjs/operators';

// Services
import { RodadaService } from '@services/rodada.service';
import { ApostaService } from '@services/aposta.service';
import { CampeonatoService } from '@services/campeonato.service';
import { ApostadorCampeonatoService } from '@services/apostadorCampeonato.service';
import { ApostadorService } from '@services/apostador.service';
import { AuthService } from '@auth/auth.service';

// Models
import { RodadaDto } from '@models/rodada/rodada-dto.model';
import { ApostaRodadaDto } from '@models/aposta/aposta-rodada-dto.model';
import { ApostaJogoEdicaoDto } from '@models/aposta/aposta-jogo-edicao-dto.model';
import { SalvarApostaRequestDto, ApostaJogoRequest } from '@models/aposta/salvar-aposta-request-dto.model';
import { NotificationDto } from '@models/common/notification.model';
import { ApiResponse, isPreservedCollection } from '@models/common/api-response.model';
import { ApostadorDto } from '@models/apostador/apostador-dto.model';
import { CampeonatoDto } from '@models/campeonato/campeonato-dto.model';
import { CriarApostaAvulsaRequestDto } from '@models/aposta/criar-aposta-avulsa-request.Dto.model'; 

import { environment } from '@environments/environment';

import { ConfirmacaoApostaModalComponent } from '@components/confirmacao-modal/confirmacao-apostaModal.Component';

@Component({
  selector: 'app-aposta-rodada-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    DatePipe,
    CurrencyPipe,
    MatDialogModule
  ],
  templateUrl: './aposta-rodada-form.component.html',
  styleUrls: ['./aposta-rodada-form.component.scss']
})
export class ApostaRodadaFormComponent implements OnInit, OnDestroy {
  isLoading: boolean = true;
  isSaving: boolean = false;
  errorMessage: string | null = null;
  notifications: NotificationDto[] = [];
  hasNotifications: boolean = false;

  campeonatoId: string | null = null;
  rodadaId: string | null = null;
  apostadorCampeonatoId: string | null = null;
  apostaRodadaId: string | null = null;
  
  userId: string | null = null;
  apostadorSaldo: number | null = null;
  custoAposta: number = 0;
  isApostadorReady: boolean = false;

  campeonatoSelecionado: CampeonatoDto | null = null;
  rodadasEmAposta: RodadaDto[] = [];
  rodadaSelecionada: RodadaDto | null = null;
  apostasUsuarioRodada: ApostaRodadaDto[] = [];
  apostaAtual: ApostaRodadaDto | null = null;
  jogosDaApostaAtual: ApostaJogoEdicaoDto[] = [];

  apostaForm!: FormGroup;
  baseUrlImagens: string = environment.imagesUrl;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private rodadaService: RodadaService,
    private apostaService: ApostaService,
    private campeonatoService: CampeonatoService,
    private apostadorService: ApostadorService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.apostaForm = this.fb.group({
      palpites: this.fb.array([])
    });
    console.log('[ApostarRodadaFormComponent] Constructor: Formulário inicializado.');
  }

  ngOnInit(): void {
    console.log('[ApostarRodadaFormComponent] ngOnInit: Iniciado.');

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
          console.log(`[ApostarRodadaFormComponent] Parâmetros da rota: CampeonatoId=${this.campeonatoId}, RodadaId=${this.rodadaId}, ApostadorCampeonatoId=${this.apostadorCampeonatoId}, ApostaRodadaId=${this.apostaRodadaId}`);
        }),
        filter(() => !!this.campeonatoId && !!this.rodadaId),
        switchMap(() => this.loadAllIntegratedData())
      ).subscribe({
        next: () => {
          this.isLoading = false;
          console.log('[ApostarRodadaFormComponent] Carregamento inicial de dados concluído.');
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = 'Erro ao carregar dados da rodada ou apostas.';
          console.error('[ApostarRodadaFormComponent] Erro no carregamento inicial:', err);
          this.showSnackBar(this.errorMessage, 'Fechar', 'error');
        }
      })
    );
  }

  ngOnDestroy(): void {
    console.log('[ApostarRodadaFormComponent] ngOnDestroy: Desinscrevendo todas as subscriptions.');
    this.subscriptions.unsubscribe();
  }

  private loadAllIntegratedData(): Observable<any> {
    this.isLoading = true;
    this.errorMessage = null;
    this.notifications = [];
    this.hasNotifications = false;

    console.log(`[ApostarRodadaFormComponent] loadAllIntegratedData - CampeonatoId: ${this.campeonatoId}, RodadaId: ${this.rodadaId}`);

    const rodadas$ = this.rodadaService.getRodadasEmAposta(this.campeonatoId!).pipe(
        map(response => {
            let rodadasExtraidas: any[] = [];
            if (response.success && response.data) {
                rodadasExtraidas = (response.data as any).$values || (Array.isArray(response.data) ? response.data : []);
            }
            return rodadasExtraidas as RodadaDto[];
        })
    );

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
                console.error('[ApostarRodadaFormComponent] Erro ao carregar lista de apostas. Prosseguindo...', error);
                return of([]);
            })
        )
        : of([]);

    const apostador$ = this.apostadorService.getDadosApostador().pipe(
        map(response => response.data as ApostadorDto)
    );

    return combineLatest([rodadas$, apostador$, apostasDoUsuario$]).pipe(
        tap(([rodadas, apostador, apostasList]) => {
            // Processa os dados de Rodadas
            this.rodadasEmAposta = rodadas;
            this.rodadaSelecionada = this.rodadasEmAposta.find(r => r.id === this.rodadaId!) || null;
            if (this.rodadaSelecionada) {
                this.custoAposta = this.rodadaSelecionada.custoApostaRodada;
            }

            // Processa os dados do Apostador
            if (apostador) {
                this.userId = apostador.id;
                this.apostadorSaldo = apostador.saldo?.valor || 0;
                this.isApostadorReady = true;
            }

            // Processa a lista de Apostas do Usuário
            this.apostasUsuarioRodada = apostasList;
            
            // LÓGICA DE SELEÇÃO INICIAL
            if (this.apostasUsuarioRodada.length > 0) {
                let apostaDeCampeonato = this.apostasUsuarioRodada.find(a => a.ehApostaCampeonato === true);
                if (apostaDeCampeonato) {
                    this.apostaAtual = apostaDeCampeonato;
                } else {
                    this.apostaAtual = this.apostasUsuarioRodada[0];
                }
            } else {
                this.apostaAtual = this.criarNovaApostaAvulsaObjeto();
            }
            this.apostaRodadaId = this.apostaAtual.id;
        }),
        switchMap(() => {
            // Agora que a aposta atual está definida, carregamos os palpites dela
            if (this.apostaAtual && this.apostaAtual.id) {
                return this.loadJogosDaApostaAtual(this.apostaAtual.id);
            } else {
                this.inicializarFormularioPalpites();
                return of([]);
            }
        }),
        tap(() => {
            console.log('[ApostarRodadaFormComponent] Palpites da aposta atual carregados.');
        }),
        finalize(() => this.isLoading = false),
        catchError(error => {
            this.isLoading = false;
            this.errorMessage = 'Erro ao carregar dados essenciais. Verifique sua conexão e tente novamente.';
            this.showSnackBar(this.errorMessage, 'Fechar', 'error');
            console.error('[ApostarRodadaFormComponent] Erro em loadAllIntegratedData:', error);
            return of(null);
        })
    );
  }

private loadJogosDaApostaAtual(apostaRodadaId: string): Observable<ApostaJogoEdicaoDto[]> {
    console.log(`[ApostarRodadaFormComponent] loadJogosDaApostaAtual - rodadaId: ${this.rodadaId}, apostaRodadaId: ${apostaRodadaId}`);

    if (!this.rodadaId || !apostaRodadaId) {
        this.showSnackBar('IDs de rodada ou aposta não disponíveis para carregar jogos.', 'Fechar', 'error');
        return of([]);
    }
    
    return this.apostaService.getApostasParaEdicao(this.rodadaId!, apostaRodadaId).pipe(
        map(jogosResponse => {
            let jogosExtraidos: ApostaJogoEdicaoDto[] = [];
            if (jogosResponse?.success && jogosResponse.data) {
                // <<-- CORREÇÃO FINAL: Lidar com o PreservedCollection -->>
                jogosExtraidos = isPreservedCollection<ApostaJogoEdicaoDto>(jogosResponse.data) 
                    ? jogosResponse.data.$values 
                    : jogosResponse.data as ApostaJogoEdicaoDto[];
            }
            return jogosExtraidos;
        }),
        tap(jogos => {
            this.jogosDaApostaAtual = jogos;
            console.log('[ApostarRodadaFormComponent] Jogos carregados para a aposta atual:', this.jogosDaApostaAtual);
            this.inicializarFormularioPalpites();
        }),
        catchError(error => {
            this.jogosDaApostaAtual = [];
            this.showSnackBar('Erro ao carregar jogos da aposta atual.', 'Fechar', 'error');
            console.error('[ApostarRodadaFormComponent] Erro ao carregar jogos da aposta atual:', error);
            return of([]);
        })
    );
}



  private inicializarFormularioPalpites(): void {
    while (this.palpites.length !== 0) {
      this.palpites.removeAt(0);
    }

    if (this.jogosDaApostaAtual && this.jogosDaApostaAtual.length > 0) {
      this.jogosDaApostaAtual.forEach(jogo => {
        this.palpites.push(this.fb.group({
          idJogo: [jogo.idJogo, Validators.required],
          placarApostaCasa: [jogo.placarApostaCasa, [Validators.required, Validators.min(0)]],
          placarApostaVisita: [jogo.placarApostaVisita, [Validators.required, Validators.min(0)]]
        }));
      });
      console.log(`[ApostarRodadaFormComponent] Formulário construído com ${this.palpites.length} jogos.`);
    } else {
      console.warn('[ApostarRodadaFormComponent] Nenhum jogo para construir o formulário de palpites.');
    }
  }

  get palpites(): FormArray {
    return this.apostaForm.get('palpites') as FormArray;
  }

  private criarNovaApostaAvulsaObjeto(): ApostaRodadaDto {
    return {
      id: '',
      apostadorCampeonatoId: this.apostadorCampeonatoId || '',
      rodadaId: this.rodadaId || '',
      identificadorAposta: 'Nova Aposta Avulsa',
      dataHoraSubmissao: null,
      ehApostaCampeonato: false,
      ehApostaIsolada: true,
      custoPagoApostaRodada: 0,
      pontuacaoTotalRodada: 0,
      statusAposta: 0,
      enviada: false,
      numJogosApostados: 0,
      apostadorCampeonato: null,
      palpites: { $id: 'temp', '$values': [] }
    };
  }

  onRodadaSelected(rodadaId: string): void {
    if (this.rodadaSelecionada?.id === rodadaId) {
      return;
    }
    this.rodadaSelecionada = this.rodadasEmAposta.find(r => r.id === rodadaId) || null;
    if (this.rodadaSelecionada) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { rodadaId: this.rodadaSelecionada.id, apostadorCampeonatoId: this.apostadorCampeonatoId },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
      console.log(`[ApostarRodadaFormComponent] Rodada ${rodadaId} selecionada. Recarregando dados.`);
      
      this.loadAllIntegratedData().subscribe();
    }
  }

  onApostaSelected(apostaId: string): void {
    if (this.apostaAtual?.id === apostaId) {
      return;
    }
    this.apostaAtual = this.apostasUsuarioRodada.find(a => a.id === apostaId) || null;
    if (this.apostaAtual) {
      this.apostaRodadaId = this.apostaAtual.id;
      console.log(`[ApostarRodadaFormComponent] Aposta ${apostaId} selecionada. Recarregando jogos.`);
      
      this.loadJogosDaApostaAtual(this.apostaAtual.id).subscribe();
    }
  }

  onClickCriarNovaAposta(): void {
    if (this.apostaForm.dirty || this.apostaForm.touched) {
      this.dialog.open(ConfirmacaoApostaModalComponent, {
        data: {
          mensagem: 'Você tem alterações não salvas. Deseja criar uma nova aposta e descartar as alterações?'
        }
      }).afterClosed().subscribe(result => {
        if (result) {
          this.processarCriacaoApostaAvulsa();
        }
      });
    } else {
      this.processarCriacaoApostaAvulsa();
    }
  }
  
  private processarCriacaoApostaAvulsa(): void {
    if (!this.isApostadorReady) {
      this.showSnackBar('Aguardando carregamento dos dados do apostador.', 'Fechar', 'info');
      return;
    }
    
    if (this.apostadorSaldo !== null && this.apostadorSaldo < this.custoAposta) {
        this.showSnackBar('Saldo insuficiente para criar uma nova aposta avulsa.', 'Fechar', 'error');
        return;
    }
    
    this.dialog.open(ConfirmacaoApostaModalComponent, {
        data: {
            mensagem: `Deseja criar uma nova aposta avulsa? Este valor será debitado do seu saldo.`,
            valorAposta: this.custoAposta
        }
    }).afterClosed().subscribe(result => {
        if (result) {
            this.criarNovaApostaAvulsa();
        }
    });
  }

  salvarApostas(): void {
    if (this.apostaForm.invalid) {
      this.showSnackBar('Por favor, preencha todos os campos obrigatórios corretamente.', 'Fechar', 'error');
      this.apostaForm.markAllAsTouched();
      return;
    }

    if (!this.apostaAtual || !this.apostaAtual.rodadaId || !this.apostadorCampeonatoId) {
      this.showSnackBar('Erro: Dados da aposta ou do apostador-campeonato não disponíveis.', 'Fechar', 'error');
      return;
    }

    this.isSaving = true;
    this.notifications = [];
    this.hasNotifications = false;

    const apostasJogosParaSalvar: ApostaJogoRequest[] = this.palpites.controls.map(control => {
      const jogoId = control.get('idJogo')?.value;
      const placarCasa = control.get('placarApostaCasa')?.value;
      const placarVisita = control.get('placarApostaVisita')?.value;

      return {
        jogoId: jogoId,
        placarCasa: placarCasa,
        placarVisitante: placarVisita
      } as ApostaJogoRequest;
    });

    const request: SalvarApostaRequestDto = {
      id: this.apostaAtual.id,
      campeonatoId: this.campeonatoId!,
      rodadaId: this.apostaAtual.rodadaId,
      apostadorCampeonatoId: this.apostadorCampeonatoId!,
      identificadorAposta: this.apostaAtual.identificadorAposta,
      ehApostaIsolada: this.apostaAtual.ehApostaIsolada,
      apostasJogos: apostasJogosParaSalvar,
      ehCampeonato: this.apostaAtual.ehApostaCampeonato
    };

    console.log('[ApostarRodadaFormComponent] Enviando requisição para salvar apostas:', request);

    this.apostaService.salvarApostas(request).pipe(
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: (response) => {
        if (response?.success) {
          this.showSnackBar('Apostas salvas com sucesso!', 'Fechar', 'success');
          this.apostaForm.markAsPristine();
          this.loadAllIntegratedData().subscribe();
        } else {
          const msg = response?.message || 'Erro ao salvar apostas.';
          this.showSnackBar(msg, 'Fechar', 'error');
          if (response?.notifications) {
            this.notifications = isPreservedCollection<NotificationDto>(response.notifications) ? response.notifications.$values : response.notifications as NotificationDto[];
            this.hasNotifications = this.notifications.length > 0;
          }
          console.error('[ApostarRodadaFormComponent] Falha ao salvar apostas:', response);
        }
      },
      error: (error) => {
        this.showSnackBar('Erro de conexão ao salvar apostas.', 'Fechar', 'error');
        console.error('[ApostarRodadaFormComponent] Erro ao salvar apostas:', error);
      }
    });
  }

  goBackToDashboard(): void {
    if (this.apostaForm.dirty || this.apostaForm.touched) {
      this.dialog.open(ConfirmacaoApostaModalComponent, {
        data: {
          mensagem: 'Você tem alterações não salvas. Deseja sair e descartar as alterações?'
        }
      }).afterClosed().subscribe(result => {
        if (result) {
          this.router.navigate(['/dashboard']);
        }
      });
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  private showSnackBar(message: string, action: string = 'Fechar', type: 'success' | 'error' | 'warning' | 'info' | 'default' = 'default'): void {
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
      duration: 3000,
      panelClass: panelClass
    });
  }


  private criarNovaApostaAvulsa(): void {
    if (!this.campeonatoId || !this.rodadaId || !this.userId) {
      this.showSnackBar('Não foi possível criar a aposta. Dados incompletos.', 'Fechar', 'error');
      return;
    }

    const request: CriarApostaAvulsaRequestDto = {
      campeonatoId: this.campeonatoId,
      rodadaId: this.rodadaId,
      apostadorId: this.userId,
      custoAposta: this.custoAposta
    };

    this.isLoading = true;

    this.apostaService.criarNovaApostaAvulsa(request).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          let apostaCriada: ApostaRodadaDto;
          if (isPreservedCollection<ApostaRodadaDto>(response.data)) {
            apostaCriada = response.data.$values[0];
          } else {
            apostaCriada = response.data;
          }
          
          this.apostaAtual = apostaCriada;
          this.apostasUsuarioRodada.push(this.apostaAtual);
          this.apostadorCampeonatoId = apostaCriada.apostadorCampeonatoId;
          this.apostaRodadaId = apostaCriada.id;
          this.apostaForm.markAsPristine();
          this.showSnackBar('Nova aposta avulsa criada com sucesso! Preencha seus palpites.', 'Fechar', 'success');
          this.loadJogosDaApostaAtual(apostaCriada.id).subscribe();
        } else {
          const msg = response?.message || 'Erro ao criar aposta avulsa.';
          this.showSnackBar(msg, 'Fechar', 'error');
        }
      },
      error: (error) => {
        this.showSnackBar('Erro de conexão ao criar aposta avulsa.', 'Fechar', 'error');
      }
    });
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
}