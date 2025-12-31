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
  errorMessage: string | null = null;  
  isLoadingCartelas: boolean = false; 
  isLoadingJogos:boolean = false;

  cartelasDaRodada: any[] = [];
  // Correção para o erro no método salvarApostas
  isSaving: boolean = false; 
  isLoadingApostas: boolean = false; 
  
  // Variáveis de controle de IDs (certifique-se que estão aqui)
  //rodadaId: string = '';
  //apostadorCampeonatoId: string = '';

  campeonatoId: string | null = null;
  rodadaId: string | null = null;
  apostadorCampeonatoId: string | null = null;
  rodadaSelecionadaId: string | null = null;
  apostaSelecionadaId: string | null = null; // Para a pintura da linha
  userId: string | null = null;

  apostadorSaldo: number | null = null;
  custoAposta = 0;
  
  rodadasDisponiveis: any[] = []; // A lista que alimenta o Grid 1

  rodadasEmAposta: RodadaDto[] = [];
  rodadaSelecionada: RodadaDto | null = null;
  apostasUsuarioRodada: ApostaRodadaDto[] = []; 
  jogosDaApostaAtual: any[] = []; // Alterado para any[] para evitar erros de tipagem
  apostaAtual: any = null;

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
      // --- CORREÇÃO 1: ALIMENTA O GRID 1 ---
      // O HTML usa rodadasDisponiveis, por isso o Grid estava vazio!
      this.rodadasDisponiveis = rodadas; 
      this.rodadasEmAposta = rodadas; 
      
      // --- CORREÇÃO 2: MAPEIA DATA PARA O HTML ---
      // Garante que r.dataInicio exista para o seu pipe | date:'dd/MM'
      this.rodadasDisponiveis.forEach(r => {
          if (!r.dataInicio && r.dataInic) r.dataInicio = r.dataInic;
      });

      this.rodadaSelecionada = rodadas.find((r: any) => r.id === this.rodadaId) || null;
      
      if (apostador) {
        this.userId = apostador.id; 
        this.apostadorSaldo = apostador.saldo?.valor || 0;
      }

      this.apostasUsuarioRodada = apostas;

      // --- CORREÇÃO 3: LÓGICA DE SELEÇÃO E ESTADO ---
      if (this.apostasUsuarioRodada && this.apostasUsuarioRodada.length > 0) {
        this.isReadOnly = false;
        // Tenta encontrar a aposta do campeonato ou pega a primeira da lista
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
// aposta-rodada-form.component.ts

private loadJogosSemPalpites(): void {
  this.isLoading = true;
  this.rodadaService.getJogosByRodada(this.rodadaId!).subscribe({
    next: (res) => {
      // Extração robusta dos dados vindos do novo endpoint
      const jogosBrutos = res.data?.$values || res.data || [];
      
      this.jogosDaApostaAtual = jogosBrutos.map((j: any) => ({
        ...j,
        idJogo: j.id,
        // Blindagem de escudos que já testamos e funcionou
        escudoMandante: j.escudoMandante || j.equipeCasaEscudoUrl || j.escudoCasa,
        escudoVisitante: j.escudoVisitante || j.equipeVisitanteEscudoUrl || j.escudoVisita,
        placarApostaCasa: null,
        placarApostaVisita: null
      }));

      this.montarGridVazio();
      this.isLoading = false;
    },
    error: (err) => {
      this.isLoading = false;
      this.showSnackBar('Erro ao carregar confrontos da rodada.', 'Fechar', 'error');
    }
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

onApostaSelected(apostaId: string): void {
  const apostaSelecionada = this.apostasUsuarioRodada.find(a => a.id === apostaId);
  
  if (apostaSelecionada) {
    this.apostaAtual = apostaSelecionada; 
    
    // 1. LIMPEZA TOTAL E IMEDIATA
    this.palpites.clear(); // Limpa o formulário
    this.jogosDaApostaAtual = []; // Limpa os escudos e nomes

    // 2. Extrai palpites tratando o $values
    const listaPalpites = (apostaSelecionada.palpites as any)?.$values || apostaSelecionada.palpites || [];

    // 3. RECONSTRUÇÃO EM SINCRONIA (Garante que a ordem do formulário = ordem dos escudos)
    this.jogosDaApostaAtual = listaPalpites.map((p: any) => {
      
      // Alimenta o FormArray ao mesmo tempo que mapeia os dados visuais
      this.palpites.push(this.fb.group({
        idJogo: [p.jogoId],
        placarApostaCasa: [p.placarApostaCasa],
        placarApostaVisita: [p.placarApostaVisita]
      }));

      // Retorna o objeto completo para o HTML (Garante nomes e escudos certos)
      return {
        ...p.jogo,
        idJogo: p.jogoId,
        escudoMandante: p.jogo.equipeCasaEscudoUrl,
        escudoVisitante: p.jogo.equipeVisitanteEscudoUrl,
        equipeMandante: p.jogo.equipeCasaNome,
        equipeVisitante: p.jogo.equipeVisitanteNome,
        dataHoraReal: p.jogo.dataHoraReal,
        horaJogo: p.jogo.horaJogo,
        estadioNome: p.jogo.estadioNome
      };
    });
    
    this.isReadOnly = false;
    this.apostaForm.markAsPristine();
  }
}


voltar(): void {
  this.location.back();
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

selecionarRodada(id: string) {
  // 1. Atualiza o estado do componente
  this.rodadaId = id;
  this.apostaAtual = null; // Limpa a cartela selecionada anteriormente
  this.jogosDaApostaAtual = []; // Limpa os jogos do Grid 3
  this.palpites.clear(); // Limpa o formulário de palpites
  
  // Encontra o objeto da rodada para mostrar o nome/número se precisar
  this.rodadaSelecionada = this.rodadasDisponiveis.find(r => r.id === id);

  console.log(`[Rodada] Alterando para rodada: ${this.rodadaSelecionada?.numeroRodada}`);

  // 2. Carrega as cartelas (Grid 2) desta rodada específica
  // Este método você provavelmente já tem, ele preenche 'apostasUsuarioRodada'
  this.carregarApostasDaRodada(id);
}

carregarApostasDaRodada(id: string) {
  this.isLoadingApostas = true;
  this.apostaService.obterApostasPorRodada(id).subscribe({
    next: (res: any) => {
      this.apostasUsuarioRodada = res.data?.$values || res.data || [];
      this.isLoadingApostas = false;
    },
    error: (err) => {
      this.isLoadingApostas = false;
      this.showSnackBar('Erro ao carregar suas cartelas.', 'Fechar', 'error');
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

  salvarApostas() {
  if (!this.apostaAtual || this.apostaForm.invalid) return;

  this.isSaving = true;

  // Captura os valores do FormArray garantindo que o jogoId esteja presente
  const valoresForm = this.palpites.getRawValue(); 

  // Montagem conforme o SalvarApostaRequestDto
  const request: SalvarApostaRequestDto = {
    id: this.apostaAtual.id,
    campeonatoId: this.campeonatoId!,
    rodadaId: this.rodadaId!,
    apostadorCampeonatoId: this.apostadorCampeonatoId!,
    ehApostaIsolada: !this.apostaAtual.ehApostaCampeonato,
    identificadorAposta: this.apostaAtual.identificadorAposta || 'AVULSA',
    ehCampeonato: this.apostaAtual.ehApostaCampeonato || false,
    
    // IMPORTANTE: O nome da propriedade deve ser apostasJogos
    apostasJogos: valoresForm.map((p: any) => ({
      jogoId: p.jogoId,
      placarCasa: p.placarApostaCasa, // Mapeie para o nome do DTO: placarCasa
      placarVisitante: p.placarApostaVisita // Mapeie para: placarVisitante
    }))
  };

  console.log('[Aposta] Enviando para o Servidor:', request);

  this.apostaService.salvarApostas(request)
    .pipe(finalize(() => this.isSaving = false))
    .subscribe({
      next: (res) => {
        if (res.success) {
          this.showSnackBar('Aposta salva com sucesso!', 'Fechar', 'success');
          this.isReadOnly = true;
          this.loadCartelasDaRodada(); // Atualiza a Data de Envio no Grid 2
        }
      },
      error: (err) => {
        console.error('Erro no salvamento:', err);
        this.showSnackBar('Erro ao processar salvamento.', 'Fechar', 'error');
      }
    });
}

private loadCartelasDaRodada(): void {
  if (!this.rodadaId || !this.apostadorCampeonatoId) return;

  this.isLoadingCartelas = true;
  
  // Chamada ao serviço para buscar as apostas do utilizador nesta rodada
  this.apostaService.getApostasPorRodadaEApostadorCampeonato(this.rodadaId, this.apostadorCampeonatoId)
    .pipe(finalize(() => this.isLoadingCartelas = false))
    .subscribe({
      next: (res) => {
        // Extração dos dados tratando a coleção preservada ($values)
        //this.cartelasDaRodada = res.data?.$values || res.data || [];
        this.cartelasDaRodada = (res.data as any)?.$values || res.data || [];

        if (this.cartelasDaRodada.length > 0) {
          // Se houver cartelas, seleciona a primeira por padrão
          this.onApostaSelected(this.cartelasDaRodada[0]);
        } else {
          // Se não houver, entra no Modo Consulta
          this.apostaAtual = null;
          this.isReadOnly = true;
          this.loadJogosSemPalpites(); 
        }
      },
      error: (err) => {
        console.error('Erro ao carregar cartelas:', err);
        this.showSnackBar('Erro ao carregar as suas apostas.', 'Fechar', 'error');
      }
    });
}

// Adicione no seu componente

selecionarAposta(aposta: any) {
  // 1. Marca qual cartela o usuário clicou para destacar no Grid 2
  this.apostaAtual = aposta;
  this.isReadOnly = true; 
  this.isLoadingJogos = true;

  // 2. Busca os jogos e palpites ordenados via Backend (Melhor Performance)
  this.apostaService.obterJogosComPalpites(aposta.id, this.rodadaId).subscribe({
    next: (res: any) => {
      // O Backend já entrega ordenado por Data e Hora!
      this.jogosDaApostaAtual = res.data?.$values || res.data || [];

      // 3. Limpa e reconstrói o formulário de palpites
      this.palpites.clear();
      this.jogosDaApostaAtual.forEach((jogo: any) => {
        this.palpites.push(this.fb.group({
          // jogoId é fundamental para o backend não dar falso positivo
          jogoId: [jogo.id || jogo.jogoId], 
          placarApostaCasa: [jogo.placarApostaCasa],
          placarApostaVisita: [jogo.placarApostaVisita]
        }));
      });

      this.isLoadingJogos = false;
      console.log(`[Aposta] Cartela ${aposta.identificadorAposta} carregada com sucesso.`);
    },
    error: (err) => {
      this.isLoadingJogos = false;
      this.showSnackBar('Erro ao carregar jogos da cartela.', 'Fechar', 'error');
    }
  });
}

// Chame este método após o sucesso do salvamento para atualizar o rodapé
atualizarStatusAposta() {
  this.loadAllIntegratedData().subscribe(() => {
    // Ao recarregar tudo, a propriedade dataHoraSubmissao virá atualizada do banco
    console.log('Status de envio atualizado no rodapé.');
  });
}

loadJogosComPalpites(apostaId: string) {
  this.isLoadingJogos = true;
  
  this.apostaService.obterJogosComPalpites(apostaId,this.rodadaId).subscribe({
    next: (res: any) => {
      // 1. Recebe os jogos e aplica a ORDENAÇÃO POR DATA E HORA
      const jogosBrutos = res.data?.$values || res.data || [];
      
      this.jogosDaApostaAtual = jogosBrutos.sort((a: any, b: any) => {
        const dataA = new Date(`${a.dataJogo}T${a.horaJogo}`).getTime();
        const dataB = new Date(`${b.dataJogo}T${b.horaJogo}`).getTime();
        return dataA - dataB;
      });

      // 2. Limpa o formulário anterior
      this.palpites.clear();

      // 3. Preenche o FormArray com os novos jogos e palpites
      this.jogosDaApostaAtual.forEach((jogo: any) => {
        this.palpites.push(this.fb.group({
          jogoId: [jogo.id], // Campo oculto essencial para o salvamento
          placarApostaCasa: [jogo.placarApostaCasa],
          placarApostaVisita: [jogo.placarApostaVisita]
        }));
      });

      this.isLoadingJogos = false;
      console.log(`[Aposta] ${this.jogosDaApostaAtual.length} jogos carregados e ordenados.`);
    },
    error: (err) => {
      console.error('Erro ao carregar jogos da aposta:', err);
      this.isLoadingJogos = false;
      this.showSnackBar('Erro ao carregar os jogos.', 'Fechar', 'error');
    }
  });
}



  goBackToDashboard() { this.router.navigate(['/dashboard']); }
  private showSnackBar(m: string, a: string, t: string) {
    this.snackBar.open(m, a, { duration: 3000, panelClass: [`snackbar-${t}`] });
  }
}