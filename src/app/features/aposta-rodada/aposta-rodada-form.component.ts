import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, FormsModule, Validators, ReactiveFormsModule } from '@angular/forms';

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
  isSaving = false;
  isLoadingPalpites = false;
  isReadOnly = true;
  errorMessage: string | null = null;

  campeonatoId: string | null = null;
  rodadaId: string | null = null;
  apostadorCampeonatoId: string | null = null;
  rodadaSelecionadaId: string | null = null;
  apostaSelecionadaId: string | null = null; // Para a pintura da linha
  userId: string | null = null;

  apostadorSaldo: number | null = null;
  custoAposta = 0;
  
  rodadasEmAposta: RodadaDto[] = [];
  rodadaSelecionada: RodadaDto | null = null;
  apostasUsuarioRodada: ApostaRodadaDto[] = []; 
  jogosDaApostaAtual: any[] = []; // Alterado para any[] para evitar erros de tipagem
  apostaAtual: any = null;

  apostaForm!: FormGroup;
  baseUrlImagens: string = environment.imagesUrl;
  private subscriptions = new Subscription();

  constructor(
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
  }

  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }

// No seu aposta-rodada-form.component.ts
private loadAllIntegratedData(): Observable<any> {
  // Blindagem contra IDs nulos
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
      this.rodadasEmAposta = rodadas;
      this.rodadaSelecionada = rodadas.find((r: any) => r.id === this.rodadaId) || null;
      
      if (apostador) {
        this.userId = apostador.id;
        this.apostadorSaldo = apostador.saldo?.valor || 0;
      }

      this.apostasUsuarioRodada = apostas;

      // Lógica de seleção: se houver apostas, carrega a edição. Se não, modo consulta.
      if (this.apostasUsuarioRodada.length > 0) {
        this.isReadOnly = false;
        const inicial = this.apostasUsuarioRodada.find(a => a.ehApostaCampeonato) || this.apostasUsuarioRodada[0];
        this.onApostaSelected(inicial.id);
      } else {
        this.isReadOnly = true; // Força modo leitura
        this.loadJogosSemPalpites(); 
      }
    }),
    finalize(() => this.isLoading = false)
  );
}

private loadJogosSemPalpites(): void {
  this.rodadaService.getJogosByRodada(this.rodadaId!).subscribe(res => {
    const dadosBrutos = (res as any).data?.$values || (res as any).data || [];
    
    // Mapeamento importante: garante que as imagens e nomes apareçam no Grid 3
    this.jogosDaApostaAtual = dadosBrutos.map((j: any) => ({
      ...j,
      idJogo: j.id,
      // Blindagem de escudos idêntica à da seleção de aposta
      escudoMandante: j.escudoMandante || j.equipeCasaEscudoUrl || j.escudoCasa,
      escudoVisitante: j.escudoVisitante || j.equipeVisitaEscudoUrl || j.escudoVisitante,
      placarApostaCasa: null,
      placarApostaVisita: null
    }));
    
    this.montarGridVazio();
  });
}

montarGridVazio(): void {
  this.palpites.clear();
  this.jogosDaApostaAtual.forEach(j => {
    this.palpites.push(this.fb.group({
      idJogo: [j.id || j.idJogo],
      // No Modo Consulta/Sem Aposta, os campos nascem desabilitados
      placarApostaCasa: [{ value: null, disabled: true }],
      placarApostaVisita: [{ value: null, disabled: true }]
    }));
  });
  console.log('[Modo Consulta] Grid vazio montado com ' + this.jogosDaApostaAtual.length + ' jogos.');
}


  onRodadaSelected(rodadaId: string) {
    this.rodadaSelecionadaId = rodadaId;
    this.rodadaId = rodadaId;
    this.apostaAtual = null;
    this.apostaSelecionadaId = null;
    this.isReadOnly = true;
    this.isLoadingPalpites = true;
    this.loadJogosSemPalpites();
    this.recarregarApostasDaRodada(rodadaId);
  }

  private recarregarApostasDaRodada(rodadaId: string) {
    if(!this.apostadorCampeonatoId) return;
    this.apostaService.getApostasPorRodadaEApostadorCampeonato(rodadaId, this.apostadorCampeonatoId)
      .subscribe(res => {
        this.apostasUsuarioRodada = (res.data as any)?.$values || res.data || [];
        if(this.apostasUsuarioRodada.length > 0) this.onApostaSelected(this.apostasUsuarioRodada[0].id);
        this.isLoadingPalpites = false;
      });
  }

  // --- CERTIFIQUE-SE QUE ESTE MÉTODO ESTÁ MAPEANDO JOGOSDAAPOSTAATUAL ---
onApostaSelected(apostaId: string): void {
  // 1. Localiza a cartela selecionada
  const apostaSelecionada = this.apostasUsuarioRodada.find(a => a.id === apostaId);
  
  if (apostaSelecionada) {
    this.apostaAtual = apostaSelecionada; 
    this.apostaSelecionadaId = apostaId; // Garante a pintura Teal
    
    // 2. Limpa o formulário anterior para não duplicar campos
    this.palpites.clear();

    // 3. Extrai a coleção de palpites tratando o $values do .NET
    const pCollection = apostaSelecionada.palpites as any;
    const listaPalpites = pCollection?.$values || (Array.isArray(pCollection) ? pCollection : []);

    if (listaPalpites.length > 0) {
      // 4. Preenche o FormArray (Lógica de Edição)
      listaPalpites.forEach((p: any) => {
        this.palpites.push(this.fb.group({
          idJogo: [p.jogoId],
          placarApostaCasa: [p.placarApostaCasa],
          placarApostaVisita: [p.placarApostaVisita]
        }));
      });

      // 5. ATUALIZA A VARIÁVEL VISUAL (O que faltava para o grid aparecer!)
      // Mapeamos os dados do 'jogo' que vêm dentro do PalpiteDto para o array do HTML
      this.jogosDaApostaAtual = listaPalpites.map((p: any) => ({
        // Espalhamos o objeto jogo que vem do backend
       ...p.jogo, 
       idJogo: p.jogoId,
       placarApostaCasa: p.placarApostaCasa,
       placarApostaVisita: p.placarApostaVisita,
       // Forçamos o mapeamento se o backend usar nomes diferentes:
       escudoMandante: p.jogo.escudoMandante || p.jogo.escudoCasa || p.jogo.equipeCasaEscudoUrl,
       escudoVisitante: p.jogo.escudoVisitante || p.jogo.escudoFora || p.jogo.equipeVisitanteEscudoUrl,
       equipeMandante: p.jogo.equipeMandante || p.jogo.nomeEquipeCasa,
       equipeVisitante: p.jogo.equipeVisitante || p.jogo.nomeEquipeVisitante
  }));


    } else {
      // Se a cartela estiver vazia, monta o grid baseado nos jogos da rodada
      this.loadJogosSemPalpites();
    }
    
    this.isReadOnly = false;
    this.apostaForm.markAsPristine();
  }
}


criarNovaApostaAvulsa(): void {
  // Monta o objeto de requisição conforme o modelo CriarApostaAvulsaRequestDto
  const request: CriarApostaAvulsaRequestDto = {
    campeonatoId: this.campeonatoId!,
    rodadaId: this.rodadaId!,
    apostadorId: this.userId!,
    custoAposta: this.custoAposta
  };

  this.isSaving = true; // Ativa o spinner de carregamento

  this.apostaService.criarNovaApostaAvulsa(request).pipe(
    finalize(() => this.isSaving = false)
  ).subscribe({
    next: (res) => {
      if (res.success) {
        this.showSnackBar('Nova aposta avulsa criada com sucesso!', 'Fechar', 'success');
        
        // RECARREGA A TELA: Chama o método principal para atualizar a lista de apostas
        // e selecionar a nova cartela automaticamente
        this.loadAllIntegratedData().subscribe();
      }
    },
    error: (err) => {
      console.error('Erro ao criar aposta:', err);
      this.showSnackBar('Erro ao criar nova cartela. Verifique seu saldo.', 'Fechar', 'error');
    }
  });
}

// --- ADICIONE ESTE MÉTODO PARA RESOLVER O ERRO NG9 ---
onClickCriarNovaAposta(): void {
  this.dialog.open(ConfirmacaoApostaModalComponent, {
    data: { 
      mensagem: `Deseja criar uma nova aposta avulsa?`, 
      valorAposta: this.custoAposta 
    }
  }).afterClosed().subscribe(result => {
    if (result) {
      this.criarNovaApostaAvulsa();
    }
  })
}

  salvarApostas(): void {
    if (this.apostaForm.invalid || !this.apostaAtual) return;
    this.isSaving = true;
    const values = this.palpites.getRawValue();
    const request = {
      id: this.apostaAtual.id,
      campeonatoId: this.campeonatoId,
      rodadaId: this.rodadaId,
      apostadorCampeonatoId: this.apostadorCampeonatoId,
      palpites: values.map((v: any) => ({
        jogoId: v.idJogo, placarApostaCasa: v.placarApostaCasa, placarApostaVisita: v.placarApostaVisita
      }))
    };
    this.apostaService.salvarApostas(request as any).pipe(finalize(() => this.isSaving = false)).subscribe(res => {
      if (res.success) {
        this.showSnackBar('Salvo com sucesso!', 'OK', 'success');
        this.apostaAtual.dataHoraSubmissao = new Date().toISOString();
        this.apostaForm.markAsPristine();
      }
    });
  }

  goBackToDashboard() { this.router.navigate(['/dashboard']); }
  private showSnackBar(m: string, a: string, t: string) {
    this.snackBar.open(m, a, { duration: 3000, panelClass: [`snackbar-${t}`] });
  }
}