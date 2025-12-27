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
import { RodadaService } from '../../core/services/rodada.service';
import { ApostaService } from '../../core/services/aposta.service';
import { CampeonatoService } from '../../core/services/campeonato.service';
import { ApostadorCampeonatoService } from '../../core/services/apostadorCampeonato.service';
import { ApostadorService } from '../../core/services/apostador.service';
import { AuthService } from '../auth/services/auth.service';


// Models
import { RodadaDto } from '../../features/rodada/model/rodada-dto.model';
import { ApostaRodadaDto } from '../../features/aposta-rodada/models/aposta-rodada-dto.model';
import { ApostaJogoEdicaoDto } from '../../features/aposta-rodada/models/aposta-jogo-edicao-dto.model';
import { SalvarApostaRequestDto, ApostaJogoRequest } from '../../features/aposta-rodada/models/salvar-aposta-request-dto.model';
import { NotificationDto } from '../../shared/models/notification.model';
import { ApiResponse, isPreservedCollection } from '../../shared/models/api-response.model';
import { ApostadorDto } from '../../features/apostador/models/apostador-dto.model';
import { CampeonatoDto } from '../../features/campeonato/models/campeonato-dto.model';
import { CriarApostaAvulsaRequestDto } from '../../features/aposta-rodada/models/criar-aposta-avulsa-request.Dto.model'; 

import { environment } from '../../../environments/environment';

import { ConfirmacaoApostaModalComponent } from '../../shared/components/confirmacao-modal/confirmacao-apostaModal.Component';

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
  isReadOnly: boolean = true; 
  isLoadingPalpites: boolean = false;
  apostaAtual: any = null;

  campeonatoId: string | null = null;
  rodadaId: string | null = null;
  apostadorCampeonatoId: string | null = null;
  apostaRodadaId: string | null = null;
  rodadaSelecionadaId: string | null = null; // ADICIONE ESTA LINHA
  
  userId: string | null = null;
  apostadorSaldo: number | null = null;
  custoAposta: number = 0;
  isApostadorReady: boolean = false;  

  campeonatoSelecionado: CampeonatoDto | null = null;
  rodadasEmAposta: RodadaDto[] = [];
  rodadaSelecionada: RodadaDto | null = null;
  apostasUsuarioRodada: ApostaRodadaDto[] = []; 
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

onRodadaSelected(rodadaId: string) {
  // 1. Limpa seleções anteriores  
  this.rodadaSelecionadaId = rodadaId;
  this.apostaAtual = null; 
  this.isReadOnly = true; // Por padrão, entra em Modo Consulta

  // 2. Busca os jogos para montar o Grid "Vazio" (Consulta)
  this.isLoadingPalpites = true;
  this.rodadaService.getJogosByRodada(rodadaId).subscribe({
    next: (jogos) => {
      this.jogosDaApostaAtual = jogos;
      this.montarGridVazio(); // Função para criar o formulário bloqueado
      this.isLoadingPalpites = false;
    },
    error: () => this.isLoadingPalpites = false
  });
}

// Função auxiliar para o Modo Consulta
montarGridVazio() {
  this.palpites.clear();
  this.jogosDaApostaAtual.forEach(jogo => {
    this.palpites.push(this.fb.group({
      jogoId: [jogo.id],
      placarApostaCasa: [{ value: null, disabled: true }], // Campo bloqueado
      placarApostaVisita: [{ value: null, disabled: true }]
    }));
  });
}

  onApostaSelected(apostaId: string) {
  this.isLoadingPalpites = true;
  
  this.apostaService.getApostaById(apostaId).subscribe(res => {
    this.apostaAtual = res.data;
    
    // LÓGICA DE TRAVA: 
    // Se a aposta não pertencer ao usuário logado, isReadOnly vira true.
    // Se a rodada já estiver fechada, isReadOnly vira true.
    const usuarioLogadoId = this.authService.getUsuarioId();
    
    if (this.apostaAtual.usuarioId === usuarioLogadoId) {
      this.isReadOnly = false; // MODO EDIÇÃO
    } else {
      this.isReadOnly = true;  // MODO CONSULTA
    }

    this.preencherFormularioComPalpites();
    this.isLoadingPalpites = false;
  });
}

preencherFormularioComPalpites(): void {
  if (!this.apostaAtual || !this.apostaAtual.palpites) return;

  // Limpa o FormArray atual para garantir sincronia
  this.palpites.clear();

  // Preenche o formulário com os dados que vieram do banco
  this.apostaAtual.palpites.forEach((palpite: any) => {
    this.palpites.push(this.fb.group({
      jogoId: [palpite.jogoId],
      placarApostaCasa: [palpite.placarApostaCasa],
      placarApostaVisita: [palpite.placarApostaVisita]
    }));
  });
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

// No seu .ts, ajuste a lógica de carregamento de jogos
carregarJogosParaConsulta(rodadaId: string) {
  this.isLoadingPalpites = true;
  this.isReadOnly = true; // Força o modo consulta
  this.apostaAtual = null; // Indica que não há uma aposta real vinculada

  this.rodadaService.getJogosByRodada(rodadaId).subscribe({
    next: (res: any) => {
      this.jogosDaApostaAtual = res.data || res; // Carrega os jogos da rodada
      
      // Monta o formulário "vazio" apenas para exibição
      this.palpites.clear();
      this.jogosDaApostaAtual.forEach(jogo => {
        this.palpites.push(this.fb.group({
          jogoId: [jogo.id],
          placarApostaCasa: [{value: null, disabled: true}], // Fica em branco/traçado
          placarApostaVisita: [{value: null, disabled: true}]
        }));
      });
      this.isLoadingPalpites = false;
    }
  });
}

}