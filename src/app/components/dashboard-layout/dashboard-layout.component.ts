// Localização: src/app/components/dashboard-layout/dashboard-layout.component.ts

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav'; // Importar MatSidenav
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Observable, Subscription, combineLatest, of } from 'rxjs';
import { filter, switchMap, tap, map, finalize, catchError} from 'rxjs/operators';


import { AuthService } from '@auth/auth.service';
import { ApostadorService } from '@services/apostador.service';
import { ApostadorDto } from '@models/apostador/apostador-dto.model';
import { ApiResponse, isPreservedCollection, PreservedCollection } from '@models/common/api-response.model'; // Importa isPreservedCollection e PreservedCollection

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatMenuModule
  ],
  templateUrl: './dashboard-layout.component.html', 
  styleUrls: ['./dashboard-layout.component.scss']
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  isAuthenticated: boolean = false;
  currentUserId: string | null = null;
  apostadorNome: string | null = null;
  apostadorSaldo: number | null = null;
  isLoggingOut: boolean = false;

  // <<-- NOVO: Propriedade para controlar o estado do sidenav (se necessário para binding two-way) -->>
  isSidenavOpen: boolean = false; 

  private subscriptions: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private apostadorService: ApostadorService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    console.log('[DashboardLayoutComponent] Constructor: Iniciado.');
  }

  ngOnInit(): void {
    console.log('[DashboardLayoutComponent] ngOnInit: Iniciado.');

    this.subscriptions.add(
      combineLatest([
        this.authService.isAuthReady$.pipe(filter(isReady => isReady)), // Espera o authService estar pronto
        this.authService.currentUser$.pipe(
          map(user => user?.uid || null), // Mapeia para o UID ou null
          tap(userId => this.currentUserId = userId) // Atualiza o currentUserId localmente
        )
      ]).pipe(
        tap(([isAuthReady, userId]) => {
          console.log('[DashboardLayoutComponent] Auth Ready e userId presente:', { isAuthReady, userId });
          this.isAuthenticated = isAuthReady && !!userId;
          if (!this.isAuthenticated) {
            this.apostadorNome = null;
            this.apostadorSaldo = null;
          }
        }),
        switchMap(([isAuthReady, userId]) => {
          if (isAuthReady && userId) {
            console.log('[DashboardLayoutComponent] Carregando dados do apostador para userId:', userId);
            return this.apostadorService.getDadosApostador().pipe(
              map(response => {
                if (response.success && response.data) {
                  const apostadorData = isPreservedCollection<ApostadorDto>(response.data) 
                                      ? (response.data.$values && response.data.$values.length > 0 ? response.data.$values[0] : null) 
                                      : response.data as ApostadorDto;
                  if (apostadorData) {
                    this.apostadorNome = apostadorData.apelido;
                    this.apostadorSaldo = apostadorData.saldo.valor;
                  }
                  return apostadorData; // Retorna o apostadorData para o pipe
                }
                return null;
              }),
              catchError(error => {
                console.error('[DashboardLayoutComponent] Erro ao carregar dados do apostador no layout:', error);
                this.showSnackBar('Erro ao carregar seus dados de apostador no layout.', 'Fechar', 'error');
                return of(null);
              })
            );
          } else {
            // Se não autenticado, retorna um observable que emite null imediatamente
            return of(null);
          }
        }),
        finalize(() => {
          console.log('[DashboardLayoutComponent] Carregamento de dados do layout finalizado.');
        })
      ).subscribe()
    );
  }

  ngOnDestroy(): void {
    console.log('[DashboardLayoutComponent] ngOnDestroy: Desinscrevendo todas as subscriptions.');
    this.subscriptions.unsubscribe();
  }

  onLogout(): void {
    this.isLoggingOut = true;
    this.authService.logout();
    this.showSnackBar('Você foi desconectado com sucesso!', 'Fechar', 'success');
    this.isLoggingOut = false;
  }

  // Método para alternar a visibilidade do sidenav
  toggleSidenav(): void {
    if (this.sidenav) {
      this.sidenav.toggle();
    }
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
