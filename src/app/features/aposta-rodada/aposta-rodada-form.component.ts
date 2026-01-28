import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
  isSaving: boolean = false; 
  isReadOnly = true;
  regraValidada: boolean = false;

  campeonatoId: string | null = null;
  rodadaId: string | null = null;
  apostadorCampeonatoId: string | null = null;
  apostadorId: string | null = null;
  rodadaSelecionadaId: string | null = null;
  apostaSelecionadaId: string | null = null; 
  userId: string | null = null;

  apostadorSaldo: number | null = null;
  rodadasDisponiveis: any[] = []; 
  rodadaSelecionada: RodadaDto | null = null;
  apostasUsuarioRodada: ApostaRodadaDto[] = []; 
  jogosDaApostaAtual: any[] = []; 
  apostaAtual: any = null;

  apostaForm!: FormGroup;
  baseUrlImagens: string = environment.imagesUrl;
  
  private subscriptions = new Subscription();

  constructor(
    private authService: AuthService,
    private location: Location,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private rodadaService: RodadaService,
    private apostaService: ApostaService,
    private apostadorService: ApostadorService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cd: ChangeDetectorRef    
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
        next: () => {
          this.isLoading = false;
          this.cd.detectChanges();
        },
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

  bloquearTeclasInvalidas(event: KeyboardEvent): void {
    const teclasProibidas = ['-', '.', ',', 'e', 'E'];
    if (teclasProibidas.includes(event.key)) {
      event.preventDefault();
    }
  }

  validarRegraMinima(): boolean {
    if (!this.palpites || this.palpites.length === 0) return false;
    const valores = this.palpites.getRawValue();
    let contadorFavoravel = 0;

    for (let p of valores) {
      if (p.placarApostaCasa === null || p.placarApostaVisita === null || p.placarApostaCasa === '' || p.placarApostaVisita === '') {
        return false; 
      }
      // Conversão explícita para Number para evitar erro de string (ex: "2" >= "10")
      if (Number(p.placarApostaVisita) >= Number(p.placarApostaCasa)) {
        contadorFavoravel++;
      }
    }
    return contadorFavoravel >= 3;
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
                placarApostaCasa: [p.placarApostaCasa, [Validators.required, Validators.min(0)]],
                placarApostaVisita: [p.placarApostaVisita, [Validators.required, Validators.min(0)]]
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
            this.regraValidada = this.validarRegraMinima();
            this.cd.detectChanges();
          }, 50);
        }
      }
    });
  }

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
        this.cd.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.showSnackBar('Erro ao carregar confrontos.', 'Fechar', 'error');
      }
    });
  }

  private loadAllIntegratedData(): Observable<any> {
    if (!this.rodadaId) return of(null);
    this.isLoading = true;

    return forkJoin({
      rodadas: this.campeonatoId ? this.rodadaService.getRodadasEmAposta(this.campeonatoId).pipe(map(res => (res.data as any)?.$values || res.data || []), catchError(() => of([]))) : of([]),
      apostador: this.apostadorService.getDadosApostador().pipe(map(res => res.data as ApostadorDto), catchError(() => of(null))),
      apostas: this.apostaService.obterApostasPorRodada(this.rodadaId, this.apostadorCampeonatoId).pipe(map(res => (res.data as any)?.$values || res.data || []), catchError(() => of([])))
    }).pipe(
      tap(({ rodadas, apostador, apostas }) => {
        this.rodadasDisponiveis = rodadas;
        this.rodadaSelecionada = rodadas.find((r: any) => r.id === this.rodadaId) || null;
        if (apostador) {
          this.userId = apostador.id;
          this.apostadorId = apostador.id;
          this.apostadorSaldo = apostador.saldo?.valor || 0;
        }
        this.apostasUsuarioRodada = apostas;
        if (this.apostasUsuarioRodada.length > 0) {
          const inicial = this.apostasUsuarioRodada.find(a => a.ehApostaCampeonato) || this.apostasUsuarioRodada[0];
          if (inicial?.id) this.onApostaSelected(inicial.id);
        } else {
          this.loadJogosSemPalpites();
        }
      }),
      finalize(() => {
        this.isLoading = false;
        this.cd.detectChanges();
      })
    );
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

  async criarNovaAposta() {
  // 1. Verificação de segurança
  if (!this.rodadaSelecionada) {
    this.showSnackBar('Selecione uma rodada primeiro!', 'Fechar', 'error');
    return;
  }

  if (!this.authService.estaLogado()) {
    this.snackBar.open('🚀 Cadastre-se para registrar palpites reais!', 'CRIAR CONTA', {
      duration: 5000,
      panelClass: ['snackbar-info']
    }).onAction().subscribe(() => {
      this.router.navigate(['/auth/register']);
    });
    return;
  }

  // 2. ✅ ESTRUTURA CORRIGIDA: Criamos o objeto 'rodada' dentro do data
  // Isso evita o erro "Cannot read properties of undefined (reading 'numeroRodada')"
  const dadosDialog = {
    valor: 10.00,
    rodada: { 
      numeroRodada: this.rodadaSelecionada?.numeroRodada || '---' 
    },
    campeonato: this.rodadaSelecionada?.campeonato?.nome || 'Campeonato'
  };

  const dialogRef = this.dialog.open(ConfirmacaoApostaDialogComponent, {
    width: '380px',
    data: dadosDialog, 
    panelClass: 'dark-dialog-container'
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.executarCriacaoAposta();
    }
  });
}


  executarCriacaoAposta() {
  const requestBody = {
    rodadaId: this.rodadaId,
    apostadorId: this.userId,
    // ✅ Como a Rodada já tem o Campeonato, pegamos dele para satisfazer o Back-end
    campeonatoId: this.rodadaSelecionada?.campeonato?.id || this.campeonatoId, 
    custoAposta: 10,
    identificadorAposta: 'Aposta Avulsa' 
  };

  this.apostaService.criarNovaApostaAvulsa(requestBody).subscribe({
    next: (res) => {
      if (res.success) {
        this.showSnackBar("Aposta criada com sucesso! 🎫");
        // Recarrega tudo para a nova cartela aparecer no grid
        this.loadAllIntegratedData().subscribe(); 
      }
    },
    error: (err) => {
      console.error("Erro ao criar aposta:", err);
      this.showSnackBar("Erro ao criar aposta. Verifique os dados.", "Fechar", "error");
    }
  });
}


  salvarApostas(): void {
  if (this.apostaForm.invalid || !this.apostaAtual?.podeEditar || !this.regraValidada) return;
  this.isSaving = true;

  // ✅ SOLUÇÃO DEFINITIVA: 
  // Se for campeonato, garante "APOSTA ÚNICA". 
  // Se for avulsa, mantém o que veio do banco (o sequencial).
  const idApostaFinal = this.apostaAtual?.identificadorAposta || 
                        (this.campeonatoId ? 'APOSTA ÚNICA' : 'Aposta Avulsa');

  const dadosParaSalvar: SalvarApostaRequestDto = {
    id: this.apostaAtual.id,
    campeonatoId: this.campeonatoId || null,
    rodadaId: this.rodadaSelecionadaId!,
    apostadorCampeonatoId: this.apostadorCampeonatoId || this.campeonatoId,
    apostadorId: this.apostadorId,
    ehApostaIsolada: !this.campeonatoId,
    
    // 🚀 O Azure (C#) não vai mais dar Erro 400 com essa linha:
    identificadorAposta: idApostaFinal, 
    
    ehCampeonato: !!this.campeonatoId,
    apostasJogos: this.palpites.getRawValue().map((p: any) => ({
      jogoId: p.jogoId,
      placarCasa: p.placarApostaCasa,
      placarVisitante: p.placarApostaVisita
    }))
  };

  this.apostaService.salvarApostas(dadosParaSalvar)
    .pipe(finalize(() => this.isSaving = false))
    .subscribe({
      next: (res) => {
        if (res.success) {
          this.showSnackBar("Palpites salvos com sucesso! 🏆");
          this.loadAllIntegratedData().subscribe();
        }
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
  private extrairDiaSemana(dataStr: string): string {
    if (!dataStr) return '';
    const dias = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
    return dias[new Date(dataStr).getDay()];
  }
  private showSnackBar(message: string, action: string = 'Fechar', type: string = 'success') {
    this.snackBar.open(message, action, { duration: 4000, panelClass: [`snackbar-${type}`] });
  }
}