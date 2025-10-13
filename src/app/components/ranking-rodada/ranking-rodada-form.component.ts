// src/app/components/ranking-rodada/ranking-rodada-form.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { Subscription, combineLatest, of, Observable } from 'rxjs';
import { switchMap, finalize, catchError, filter, tap } from 'rxjs/operators';
import { RankingService } from '@services/ranking.sevice';
import { ApostadorService } from '@services/apostador.service';
import { ApiResponse } from '@models/common/api-response.model';
import { RankingDto } from '@models/ranking/ranking-dto.model';
import { ApostadorDto } from '@models/apostador/apostador-dto.model';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-ranking-rodada-form',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatListModule,
    DatePipe
  ],
  templateUrl: './ranking-rodada-form.component.html',
  styleUrls: ['./ranking-rodada-form.component.scss']
})
export class RankingRodadaFormComponent implements OnInit, OnDestroy {
  baseUrlImagens: string = environment.imagesUrl;
  isLoading: boolean = true;
  errorMessage: string | null = null;
  campeonatoId: string | null = null;
  rodadaId: string | null = null;
  apostadorLogadoId: string | null = null;
  ranking: RankingDto[] = [];
  rankingUsuario: RankingDto | null = null;
  pontosPrimeiroColocado: number = 0;
  pontosAfastado: number | null = null;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rankingService: RankingService,
    private apostadorService: ApostadorService,
    private snackBar: MatSnackBar
  ) { }

 ngOnInit(): void {
  this.subscriptions.add(
    combineLatest([
      this.route.paramMap,
      this.apostadorService.getDadosApostador().pipe(
        catchError(() => of({ success: false, data: null }))
      )
    ]).pipe(
      tap(([params, apostadorResponse]) => {
        this.campeonatoId = params.get('campeonatoId');
        this.rodadaId = params.get('rodadaId');
        
        if (apostadorResponse.success && apostadorResponse.data) {
          // CORRECTED: Use apostadorResponse.data.id to get the apostadorId
          this.apostadorLogadoId = apostadorResponse.data.id;
          
          // You can use this log to confirm the correct ID is being assigned
          console.log('ID do Apostador Logado:', this.apostadorLogadoId);
        }
      }),
      filter(([params]) => !!params.get('campeonatoId') && !!params.get('rodadaId')),
      switchMap(() => this.loadRankingData())
    ).subscribe({
      next: () => this.isLoading = false,
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Erro ao carregar o ranking da rodada.';
        this.showSnackBar(this.errorMessage, 'Fechar', 'error');
      }
    })
  );
}

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }


private loadRankingData(): Observable<any> {
    this.isLoading = true;
    this.errorMessage = null;

    return this.rankingService.getRankingRodada(this.rodadaId!).pipe(
        tap(response => {
            console.log('Dados da API recebidos:', response);

            if (response.success && response.data) {
                // Acessa o array de rankings que está dentro de 'data.$values'
                const rankingCompleto = (response.data as any).$values as RankingDto[];
                
                if (rankingCompleto) {
                    // 1. Atribui o ranking completo
                    this.ranking = rankingCompleto;

                    if (this.apostadorLogadoId) {
                        // 2. Encontra o apostador logado na lista completa
                        this.rankingUsuario = rankingCompleto.find(r => r.apostadorId === this.apostadorLogadoId) || null;

                        // 3. Se o apostador logado não estiver entre os 20 primeiros, adiciona-o no topo.
                        const isUserInTop20 = this.ranking.slice(0, 20).some(r => r.apostadorId === this.apostadorLogadoId);
                        
                        if (this.rankingUsuario && !isUserInTop20) {
                             // Cria uma cópia da lista para não modificar o array original
                            this.ranking = [this.rankingUsuario, ...this.ranking];
                        }

                        // 4. Calcula a diferença de pontos para o primeiro colocado
                        if (rankingCompleto.length > 0 && this.rankingUsuario) {
                            this.pontosPrimeiroColocado = rankingCompleto[0].pontuacao;
                            this.pontosAfastado = this.pontosPrimeiroColocado - this.rankingUsuario.pontuacao;
                        } else {
                            this.pontosAfastado = null;
                        }
                    }
                    // 5. Limita a lista principal para exibir apenas os 20 primeiros
                    this.ranking = this.ranking.slice(0, 20);

                } else {
                    this.errorMessage = response.message || 'Dados inválidos recebidos da API.';
                }
            }
        }),
        finalize(() => this.isLoading = false),
        catchError(error => {
            this.isLoading = false;
            this.errorMessage = 'Erro ao carregar os dados do ranking.';
            this.showSnackBar(this.errorMessage, 'Fechar', 'error');
            console.error('Erro na requisição:', error);
            return of([]);
        })
    );
}

// Método para voltar à página anterior
goBack(): void {
  window.history.back();
}

  
getFotoPerfilUrl(fileName: string | null): string {
  if (!fileName) {
    return '';
  }
  // Retorna o caminho exato que a API já fornece
  return `${environment.apiUrl}${fileName}`;

}
  private showSnackBar(message: string, action: string = 'Fechar', type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
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
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: panelClass
    });
  }
}