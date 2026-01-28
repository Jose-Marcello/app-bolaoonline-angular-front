import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, FormsModule, Validators, ReactiveFormsModule } from '@angular/forms';
import { Location } from '@angular/common'; 

// Angular Material 
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { Subscription, combineLatest, of, Observable, forkJoin } from 'rxjs';
import { switchMap, finalize, catchError, filter, tap, map } from 'rxjs/operators';

// Services & Models
import { RodadaService } from '../../core/services/rodada.service';
import { ApostaService } from '../../core/services/aposta.service';
import { ApostadorService } from '../../core/services/apostador.service';
import { AuthService } from '../auth/services/auth.service';
import { RodadaDto } from '../../features/rodada/model/rodada-dto.model';
import { ApostaRodadaDto } from '../../features/aposta-rodada/models/aposta-rodada-dto.model';
import { SalvarApostaRequestDto } from '../../features/aposta-rodada/models/salvar-aposta-request-dto.model';
import { ApostadorDto } from '../../features/apostador/models/apostador-dto.model';
import { environment } from '../../../environments/environment';
import { CriarApostaAvulsaRequestDto } from '../../features/aposta-rodada/models/criar-aposta-avulsa-request.Dto.model';

// ✅ Importe o componente de diálogo de confirmação que você já possui
import { ConfirmacaoApostaDialogComponent } from '../../shared/components/confirmacao-aposta-avulsa/confirmacao-apostaAvulsaModal.component';

@Component({
  selector: 'app-aposta-rodada-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatCardModule, MatButtonModule, 
    MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, 
    MatFormFieldModule, MatInputModule, DatePipe, CurrencyPipe, MatDialogModule
  ],
  templateUrl: './aposta-rodada-form.component.html',
  styleUrls: ['./aposta-rodada-form.component.scss']
})
export class ApostaRodadaFormComponent implements OnInit, OnDestroy {
  isLoading = true; 
  loading: boolean = false;
  isLoadingPalpites = false;
  isReadOnly = true;
  podeEditar: boolean = false;
  errorMessage: string | null = null;  
  isLoadingCartelas: boolean = false; 
  isLoadingJogos: boolean = false;
  isSaving: boolean = false; 
  isLoadingApostas: boolean = false; 

  campeonatoId: string | null = null;
  rodadaId: string | null = null;
  apostadorCampeonatoId: string | null = null;
  apostadorId: string | null = null;
  rodadaSelecionadaId: string | null = null;
  apostaSelecionadaId: string | null = null; 
  userId: string | null = null;

  apostadorSaldo: number | null = null;
  custoAposta = 0;
  
  rodadasDisponiveis: any[] = []; 
  rodadasEmAposta: RodadaDto[] = [];
  rodadaSelecionada: RodadaDto | null = null;
  apostasUsuarioRodada: ApostaRodadaDto[] = []; 
  jogosDaApostaAtual: any[] = []; 
  apostaAtual: any = null;
  regraValidada: boolean = false;

  apostaForm!: FormGroup;
  baseUrlImagens: string = environment.imagesUrl;
  
  private subscriptions = new Subscription();

  constructor(
    private authService: AuthService,     // ✅ Resolvido erro TS2339
    private location: Location,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private rodadaService: RodadaService,
    private apostaService: ApostaService,
    private apostadorService: ApostadorService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog     
  ) {
    this.apostaForm = this.fb.group({
      palpites: this.fb.array([])
    });
  }

  get palpites(): FormArray {
    return this.apostaForm.get('palpites') as FormArray;
  }

  ngOnInit(): void {
    this.subscriptions.add(
      combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
        tap(([params, queryParams]) => {
          this.campeonatoId = params.get('campeonatoId');
          this.rodadaId = params.get('rodadaId');
          this.apostadorCampeonatoId = queryParams.get('apostadorCampeonatoId');
          this.rodadaSelecionadaId = this.rodadaId;
        }),
        filter(() => !!this.rodadaId),
        switchMap(() => this.loadAllIntegratedData())
      ).subscribe({
        next: () => this.isLoading = false,
        error: () => this.isLoading = false
      })
    );

    this.subscriptions.add(
      this.apostaForm.valueChanges.subscribe(() => {
        this.regraValidada = this.validarRegraMinima();
      })
    );
  }

  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }

  private loadJogosSemPalpites(): void {
    this.isLoading = true;
    this.rodadaService.getJogosByRodada(this.rodadaId!).subscribe({
      next: (res) => {
        const jogosBrutos = res.data?.$values || res.data || [];
        this.jogosDaApostaAtual = jogosBrutos.map((j: any) => ({
          ...j,
          idJogo: j.id,
          equipeCasaNome: j.equipeCasaNome || j.equipeCasa?.nome,
          equipeVisitanteNome: j.equipeVisitanteNome || j.equipeVisitante?.nome,
          equipeCasaEscudoUrl: j.equipeCasaEscudoUrl || j.equipeCasa?.escudo,
          equipeVisitanteEscudoUrl: j.equipeVisitanteEscudoUrl || j.equipeVisitante?.escudo,
          dataHora: j.dataHora, 
          diaSemana: this.extrairDiaSemana(j.dataHora),
          horaJogo: j.dataHora ? new Date(j.dataHora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '',
          estadioNome: j.EstadioNome || j.estadioNome
        }));
        this.apostaAtual = { identificadorAposta: 'CONSULTA DE JOGOS', podeEditar: false };
        this.montarGridVazio();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.showSnackBar('Erro ao carregar confrontos.', 'Fechar', 'error');
      }
    });
  }

  private loadAllIntegratedData(): Observable<any> {
    if (!this.rodadaId) {
      this.showSnackBar('Erro: Identificador da rodada ausente.', 'Fechar', 'error');
      return of(null);
    }

    this.isLoading = true;

    return forkJoin({
      rodadas: this.campeonatoId 
        ? this.rodadaService.getRodadasEmAposta(this.campeonatoId).pipe(
            map(res => (res.data as any)?.$values || res.data || []),
            catchError(() => of([]))
          )
        : of([]),
        
      apostador: this.apostadorService.getDadosApostador().pipe(
        map(res => res.data as ApostadorDto),
        catchError(() => of(null))
      ),
      
      apostas: this.apostaService.obterApostasPorRodada(this.rodadaId, this.apostadorCampeonatoId).pipe(
        map(res => (res.data as any)?.$values || res.data || []),
        catchError(() => of([]))
      )
    }).pipe(
      tap(({ rodadas, apostador, apostas }) => {
        const listaRodadas = rodadas as any[];
        this.rodadasDisponiveis = listaRodadas;
        this.rodadasEmAposta = listaRodadas;
        this.rodadaSelecionada = listaRodadas.find((r: any) => r.id === this.rodadaId) || null;

        if (apostador) {
          this.userId = apostador.id;
          this.apostadorId = apostador.id;
          this.apostadorSaldo = apostador.saldo?.valor || 0;
        }

        this.apostasUsuarioRodada = apostas as any[];

        if (this.apostasUsuarioRodada && this.apostasUsuarioRodada.length > 0) {
          this.isReadOnly = false;
          const inicial = this.apostasUsuarioRodada.find(a => a.ehApostaCampeonato) || this.apostasUsuarioRodada[0];
          if (inicial && inicial.id) {
            this.onApostaSelected(inicial.id);
          }
        } else {
          this.isReadOnly = true;
          this.loadJogosSemPalpites();
        }
      }),
      finalize(() => this.isLoading = false)
    );
  }

  private extrairDiaSemana(dataStr: string): string {
    if (!dataStr) return '';
    const data = new Date(dataStr);
    const dias = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
    return dias[data.getDay()];
  }

  montarGridVazio(): void {
    this.palpites.clear();
    this.jogosDaApostaAtual.forEach(j => {
      this.palpites.push(this.fb.group({
        jogoId: [j.id || j.idJogo],
        placarApostaCasa: [{ value: null, disabled: true }],
        placarApostaVisita: [{ value: null, disabled: true }]
      }));
    });
  }

  onApostaSelected(apostaId: string): void {
    this.apostaSelecionadaId = apostaId;
    this.apostaService.getApostasParaEdicao(this.rodadaId!, apostaId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.apostaAtual = undefined;
          this.palpites.clear();
          this.jogosDaApostaAtual = [];

          setTimeout(() => {
            const listaPalpites = (res.data as any)?.$values || res.data;
            const apostaLocal = this.apostasUsuarioRodada.find(a => a.id === apostaId);
            this.apostaAtual = { ...apostaLocal, podeEditar: apostaLocal?.podeEditar === true };

            listaPalpites.forEach((p: any) => {
              this.palpites.push(this.fb.group({
                id: [p.id],
                jogoId: [p.idJogo],
                placarApostaCasa: [p.placarApostaCasa, [Validators.required]],
                placarApostaVisita: [p.placarApostaVisita, [Validators.required]]
              }));

              this.jogosDaApostaAtual.push({
                ...p,
                equipeCasaNome: p.equipeMandante,
                equipeVisitanteNome: p.equipeVisitante,
                equipeCasaEscudoUrl: p.escudoMandante || 'logobolao.png',
                equipeVisitanteEscudoUrl: p.escudoVisitante || 'logobolao.png',
                estadioNome: p.estadioNome || 'Estádio não informado',
                dataHora: p.dataJogo,
                diaSemana: p.diaSemana
              });
            });
            this.apostaForm.markAsPristine();
          }, 50);
        }
      }
    });
  }

  validarRegraMinima(): boolean {
    if (!this.palpites || this.palpites.length === 0) return false;
    const valores = this.palpites.getRawValue();
    let contador = 0;
    for (let p of valores) {
      if (p.placarApostaCasa === null || p.placarApostaVisita === null) return false;
      if (p.placarApostaVisita >= p.placarApostaCasa) contador++;
    }
    return contador >= 3;
  }

  async criarNovaAposta() {
    // 1. ✅ BLOQUEIO DE SEGURANÇA PARA VISITANTES
    if (!this.authService.estaLogado()) {
      this.snackBar.open('🚀 Cadastre-se para registrar palpites reais!', 'CRIAR CONTA', {
        duration: 5000,
        panelClass: ['snackbar-info']
      }).onAction().subscribe(() => {
        this.router.navigate(['/auth/register']);
      });
      return; // ✅ Impede abertura do confirm/dialog
    }

    // 2. ✅ SUBSTITUIÇÃO DO CONFIRM PELO MATDIALOG
    const dialogRef = this.dialog.open(ConfirmacaoApostaDialogComponent, {
      width: '380px',
      data: { valor: 10.00, rodada: this.rodadaId },
      panelClass: 'dark-dialog-container' // ✅ Mantém o tema escuro
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.executarCriacaoAposta();
      }
    });
  }

  private executarCriacaoAposta(): void {
    this.loading = true;
    
    console.log('--- [DEBUG] EXECUTAR CRIAÇÃO AVULSA ---');

    // 🚀 AJUSTE DE 15K: Chaves em PascalCase para o .NET não dar Erro 400
    const request = {
      CampeonatoId: this.campeonatoId || null,
      RodadaId: this.rodadaId!,
      ApostadorId: this.userId!, // O campo que estava faltando!
      CustoAposta: 10
    };

    console.log('Payload Final (PascalCase):', request);

    // Usamos 'as any' para o Service aceitar as chaves maiúsculas sem reclamar
    this.apostaService.criarNovaApostaAvulsa(request as any).subscribe({
      next: (res) => {
        console.log('✅ Aposta Criada com Sucesso:', res);
        this.showSnackBar("Aposta criada com sucesso!", 'Fechar', 'success');
        this.palpites.clear();
        this.jogosDaApostaAtual = [];
        this.loadAllIntegratedData().subscribe();
      },
      error: (err) => {
        this.loading = false;
        console.error('❌ Erro na Criação da Aposta:', err);
        
        // Se der 400, aqui veremos exatamente qual campo o Azure rejeitou
        if (err.error?.errors) {
          console.table(err.error.errors); 
        }
        
        const msg = err.error?.message || "Erro ao criar aposta.";
        this.showSnackBar(msg, 'Fechar', 'error');
      },
      complete: () => this.loading = false
    });
  }
  
  salvarApostas(): void {
  if (this.apostaForm.invalid || !this.apostaAtual?.podeEditar || !this.regraValidada) return;
  
  this.isSaving = true;

  const dadosParaSalvar: SalvarApostaRequestDto = {
    id: this.apostaAtual.id,
    campeonatoId: this.campeonatoId || null, // Se for vazio, envia null
    rodadaId: this.rodadaSelecionadaId!,
    
    // AJUSTE AQUI: Se for nulo (avulsa), manda o campeonatoId só para passar na validação do C#
    // O banco vai ignorar se a lógica de EhApostaCampeonato estiver correta
    apostadorCampeonatoId: this.apostadorCampeonatoId || this.campeonatoId,
    
    apostadorId: this.apostadorId,
    ehApostaIsolada: !this.campeonatoId,
    identificadorAposta: this.apostaAtual.identificadorAposta,
    ehCampeonato: !!this.campeonatoId,
    apostasJogos: this.palpites.getRawValue().map((p: any) => ({
      jogoId: p.jogoId,
      placarCasa: p.placarApostaCasa,
      placarVisitante: p.placarApostaVisita
    }))
  };

  console.log('Objeto enviado para o Azure:', dadosParaSalvar);

  this.apostaService.salvarApostas(dadosParaSalvar).pipe(
    finalize(() => this.isSaving = false)
  ).subscribe({
    next: (res) => {
      if (res.success) {
        this.showSnackBar("Palpites salvos com sucesso! 🏆");
        this.loadAllIntegratedData().subscribe();
      } else {
        this.showSnackBar(res.message || "Erro ao processar salvamento.", 'Fechar', 'error');
      }
    },
    error: (err) => {
      console.error('Erro técnico no salvamento:', err);
      this.showSnackBar("Erro de conexão ou validação no servidor.", 'Fechar', 'error');
    }
  });
}


  selecionarRodada(id: string) {
    this.rodadaId = id;
    this.rodadaSelecionadaId = id;
    this.apostaAtual = undefined;
    this.apostaSelecionadaId = ''; 
    this.palpites.clear();
    this.loadAllIntegratedData().subscribe();
  }

  voltar(): void { this.location.back(); }

  private showSnackBar(message: string, action: string = 'Fechar', type: string = 'success') {
    this.snackBar.open(message, action, {
      duration: 4000,
      panelClass: [`snackbar-${type}`],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
}