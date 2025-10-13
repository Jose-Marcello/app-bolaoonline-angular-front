import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CampeonatoDto } from '@models/campeonato/campeonato-dto.model';
import { RodadaDto } from '@models/rodada/rodada-dto.model';
import { ApostaService } from '@services/aposta.service';
import { ApostasAvulsasTotaisDto } from '@models/aposta/apostas-avulsas-totais-dto.model';
import { take } from 'rxjs/operators';
import { ApiResponse } from '@models/common/api-response.model';

@Component({
  selector: 'app-apostas-totais-card',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './apostas-totais-card.component.html',
  styleUrls: ['./apostas-totais-card.component.scss']
})
export class ApostasTotaisCardComponent implements OnInit {
  
  @Input() titulo: string = '';
  @Input() campeonato!: CampeonatoDto;
  @Input() rodada!: RodadaDto;

  taxaAdministrativa = 0.10;
  totais: ApostasAvulsasTotaisDto = { numeroDeApostas: 0, valorTotal: 0 };
  isLoading: boolean = true;

  constructor(private apostaService: ApostaService) { }

  ngOnInit(): void {
    if (this.rodada && this.rodada.id) {
      this.carregarTotais();
    } else {
      this.isLoading = false;
    }
  }

  private carregarTotais(): void {
    this.isLoading = true;
    this.apostaService.obterTotaisApostasAvulsas(this.rodada.id).pipe(
      take(1)
    ).subscribe({
      next: (response: ApiResponse<ApostasAvulsasTotaisDto>) => {
        if (response.success && response.data) {
          this.totais = response.data;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar totais de apostas:', err);
        this.isLoading = false;
      }
    });
  }
}