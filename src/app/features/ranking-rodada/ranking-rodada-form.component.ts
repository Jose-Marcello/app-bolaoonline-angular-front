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

import { RankingService } from '../../core/services/ranking.sevice';
import { ApostadorService } from '../../core/services/apostador.service';
import { ApiResponse } from '../../shared/models/api-response.model';
import { RankingDto } from '../../features/ranking-rodada/models/ranking-dto.model';
import { ApostadorDto } from '../../features/apostador/models/apostador-dto.model';
import { environment } from '../../../environments/environment';

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

  readonly API_URL = 'https://localhost:5001';

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
            if (response.success && response.data) {
                const rawData = response.data as any;
                const rankingCompleto = (rawData.$values ? rawData.$values : rawData) as RankingDto[];

                if (Array.isArray(rankingCompleto)) {
                    // 1. Identifica o usuário e calcula distância para o prêmio
                    if (this.apostadorLogadoId) {
                        this.rankingUsuario = rankingCompleto.find(r => r.apostadorId === this.apostadorLogadoId) || null;
                        
                        if (this.rankingUsuario) {
                            this.pontosPrimeiroColocado = rankingCompleto[0].pontuacao;
                            this.pontosAfastado = this.pontosPrimeiroColocado - this.rankingUsuario.pontuacao;
                        }
                    }

                    // 2. Prepara a lista de exibição (Top 20)
                    this.ranking = rankingCompleto.slice(0, 20);

                    // 3. Garante que o usuário logado apareça na lista mesmo fora do Top 20
                    if (this.rankingUsuario) {
                        const isUserInTop20 = this.ranking.some(r => r.apostadorId === this.apostadorLogadoId);
                        if (!isUserInTop20) {
                            this.ranking.push(this.rankingUsuario);
                        }
                    }
                }
            }
        }),
        finalize(() => this.isLoading = false),
        catchError(error => {
            this.errorMessage = 'Erro ao carregar o ranking da rodada.';
            this.showSnackBar(this.errorMessage, 'Fechar', 'error');
            return of([]);
        })
    );
}


// Método para voltar à página anterior
goBack(): void {
  window.history.back();
}

  
getFotoPerfilUrl(fileName: string | null): string {
    if (!fileName) return '';
    const baseUrl = environment.apiUrl.endsWith('/') ? environment.apiUrl : `${environment.apiUrl}/`;
    return `${baseUrl}${fileName.startsWith('/') ? fileName.substring(1) : fileName}`;
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