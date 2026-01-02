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
import { RodadaDto } from '../../features/rodada/model/rodada-dto.model';
import { ApostaRodadaDto } from '../../features/aposta-rodada/models/aposta-rodada-dto.model';
import { SalvarApostaRequestDto } from '../../features/aposta-rodada/models/salvar-aposta-request-dto.model';
import { ApostadorDto } from '../../features/apostador/models/apostador-dto.model';
import { environment } from '../../../environments/environment';
import { ConfirmacaoApostaModalComponent } from '../../shared/components/confirmacao-modal/confirmacao-apostaModal.Component';
import { CriarApostaAvulsaRequestDto } from '../../features/aposta-rodada/models/criar-aposta-avulsa-request.Dto.model'

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
        filter(() => !!this.campeonatoId && !!this.rodadaId),
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

  private loadAllIntegratedData(): Observable<any> {
    if (!this.campeonatoId || !this.rodadaId) {
      this.showSnackBar('Erro: Parâmetros de rota ausentes.', 'Fechar', 'error');
      return of(null);
    }

    this.isLoading = true;

    return forkJoin({
      rodadas: this.rodadaService.getRodadasEmAposta(this.campeonatoId).pipe(
        map(res => (res.data as any)?.$values || res.data || []),
        catchError(() => of([]))
      ),
      apostador: this.apostadorService.getDadosApostador().pipe(
        map(res => res.data as ApostadorDto),
        catchError(() => of(null))
      ),
      apostas: this.apostadorCampeonatoId 
        ? this.apostaService.getApostasPorRodadaEApostadorCampeonato(this.rodadaId, this.apostadorCampeonatoId).pipe(
            map(res => (res.data as any)?.$values || res.data || []),
            catchError(() => of([]))
          )
        : of([])
    }).pipe(
      tap(({ rodadas, apostador, apostas }) => {
        this.rodadasDisponiveis = rodadas; 
        this.rodadasEmAposta = rodadas; 
             
        
        this.rodadasDisponiveis.forEach(r => {
            if (!r.dataInicio && r.dataInic) r.dataInicio = r.dataInic;
        });

        this.rodadaSelecionada = rodadas.find((r: any) => r.id === this.rodadaId) || null;
       
        this.custoAposta = this.rodadaSelecionada.custoApostaRodada || 0;

        if (apostador) {
          this.userId = apostador.id; 
          this.apostadorSaldo = apostador.saldo?.valor || 0;
        }

        this.apostasUsuarioRodada = apostas;

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

  private loadJogosSemPalpites(): void {
    this.isLoading = true;
    this.rodadaService.getJogosByRodada(this.rodadaId!).subscribe({
      next: (res) => {
        const jogosBrutos = res.data?.$values || res.data || [];
        this.jogosDaApostaAtual = jogosBrutos.map((j: any) => ({
          ...j,
          idJogo: j.id,
          escudoMandante: j.escudoMandante || j.equipeCasaEscudoUrl || j.escudoCasa,
          escudoVisitante: j.escudoVisitante || j.equipeVisitanteEscudoUrl || j.escudoVisita,
          placarApostaCasa: null,
          placarApostaVisita: null
        }));
        this.montarGridVazio();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.showSnackBar('Erro ao carregar confrontos.', 'Fechar', 'error');
      }
    });
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
    const aposta = this.apostasUsuarioRodada.find(a => a.id === apostaId);
    
    if (aposta) {
      this.apostaAtual = undefined;
      this.palpites.clear();
      this.jogosDaApostaAtual = [];

      setTimeout(() => {
        this.apostaAtual = {
          ...aposta,
          podeEditar: aposta.podeEditar === true
        };

        const pCollection = aposta.palpites as any;
        const listaPalpites = pCollection?.$values || (Array.isArray(pCollection) ? pCollection : []);

        listaPalpites.forEach((p: any) => {
          this.palpites.push(this.fb.group({
            id: [p.id],
            jogoId: [p.jogoId || p.jogo?.id], // CORREÇÃO DO CONTRATO
            placarApostaCasa: [p.placarApostaCasa, [Validators.required]],
            placarApostaVisita: [p.placarApostaVisita, [Validators.required]]
          }));
          this.jogosDaApostaAtual.push(p.jogo);
        });

        this.apostaForm.markAsPristine();
      }, 50);
    }
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

  criarNovaApostaAvulsa(): void {
    if (this.apostadorSaldo !== null && this.apostadorSaldo < this.custoAposta) {
      this.showSnackBar('Saldo insuficiente para criar uma nova cartela.', 'Fechar', 'warning');
      return;
    }

    const request: CriarApostaAvulsaRequestDto = {
      campeonatoId: this.campeonatoId!,
      rodadaId: this.rodadaId!,
      apostadorId: this.userId!,
      custoAposta: this.custoAposta
    };

    this.isSaving = true;
    this.apostaService.criarNovaApostaAvulsa(request).pipe(
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.showSnackBar('Aposta criada e valor debitado!', 'Fechar', 'success');
          this.loadAllIntegratedData().subscribe();
        } else {
          this.showSnackBar(res.message || 'Erro ao processar aposta.', 'Fechar', 'error');
        }
      },
      error: () => this.showSnackBar('Erro de comunicação financeira.', 'Fechar', 'error')
    });
  }

  salvarApostas(): void {
    if (this.apostaForm.invalid || !this.apostaAtual?.podeEditar) return;

    const dadosParaSalvar: SalvarApostaRequestDto = {
      id: this.apostaAtual.id,
      campeonatoId: this.campeonatoId!,
      rodadaId: this.rodadaSelecionadaId!,
      apostadorCampeonatoId: this.apostadorCampeonatoId!,
      ehApostaIsolada: !this.apostaAtual.ehApostaCampeonato,
      identificadorAposta: this.apostaAtual.identificadorAposta,
      ehCampeonato: this.apostaAtual.ehApostaCampeonato,
      apostasJogos: this.palpites.getRawValue().map((p: any) => ({
        jogoId: p.jogoId, // ENVIANDO O ID DO JOGO CORRETO
        placarCasa: p.placarApostaCasa,
        placarVisitante: p.placarApostaVisita
      }))
    };

    this.apostaService.salvarApostas(dadosParaSalvar).subscribe({
      next: (res) => {
        if (res.success && res.data !== null) {
          alert("Palpites salvos com sucesso!"); // Mantendo conforme seu print de sucesso
          this.loadAllIntegratedData().subscribe();
        } else {
          this.showSnackBar(res.message || 'O servidor não gravou os dados.', 'Fechar', 'error');
        }
      },
      error: () => alert("Erro ao conectar com o servidor.")
    });
  }

  // MÉTODOS DE APOIO
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