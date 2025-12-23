import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Subscription, combineLatest, of } from 'rxjs';
import { filter, switchMap, tap, map, catchError } from 'rxjs/operators';

import { AuthService } from '../../features/auth/services/auth.service';
import { ApostadorService } from '../../core/services/apostador.service';
import { ApostadorDto } from '../../features/apostador/models/apostador-dto.model';
import { isPreservedCollection } from '../../shared/models/api-response.model';

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
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {
  
  // ✅ Adicione esta propriedade para o HTML parar de reclamar
  isSidenavOpen: boolean = false; 

  // ... outras propriedades (apostadorNome, etc)

  @ViewChild('sidenav') sidenav!: MatSidenav;


  isAuthenticated: boolean = false;
  currentUserId: string | null = null;
  apostadorNome: string | null = null;
  apostadorSaldo: number | null = null;
  isLoggingOut: boolean = false;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private apostadorService: ApostadorService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
  console.log('[DashboardLayoutComponent] ngOnInit: Iniciado.');
  

  this.subscriptions.add(
    // ✅ CORREÇÃO: Certifique-se de que os observables estão dentro de um ÚNICO array []
    combineLatest([
      this.authService.isAuthReady$.pipe(filter(isReady => !!isReady)),
      this.authService.currentUser$.pipe(
        map(user => user?.uid || null)
      )
    ]).pipe(
      // Agora o TS reconhecerá que a emissão é uma tupla [boolean, string | null]
      tap(([isAuthReady, userId]) => {
        console.log('[DashboardLayoutComponent] Auth Ready e userId presente:', { isAuthReady, userId });
        this.currentUserId = userId;
        this.isAuthenticated = isAuthReady && !!userId;
        
        if (!this.isAuthenticated) {
          this.apostadorNome = null;
          this.apostadorSaldo = null;
        }
      }),
      
      switchMap(([isAuthReady, userId]) => {
        if (isAuthReady && userId) {
          console.log('[DashboardLayoutComponent] Identificamos o ID, buscando dados do apostador...');
          return this.apostadorService.getDadosApostador().pipe(
            tap(res => console.log('[DashboardLayoutComponent] Resposta bruta da API:', res)),
            map(response => {
              if (response.success && response.data) {
                const apostadorData = isPreservedCollection<ApostadorDto>(response.data) 
                                      ? (response.data.$values?.[0] || null) 
                                      : response.data as ApostadorDto;
                
                if (apostadorData) {
                  // ✅ Verifique se o nome do campo é 'apelido' ou 'nome' no seu DTO
                  this.apostadorNome = apostadorData.apelido; 
                  this.apostadorSaldo = apostadorData.saldo?.valor ?? 0;
                  console.log('[DashboardLayoutComponent] Nome definido para:', this.apostadorNome);
                }
                return apostadorData;
              }
              return null;
            })
          );
        }
        return of(null);
      })      
   
    ).subscribe()
  );
}

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onLogout(): void {
    this.isLoggingOut = true;
    this.authService.logout();
    this.showSnackBar('Você foi desconectado com sucesso!', 'Fechar', 'success');
    this.isLoggingOut = false;
  }

  toggleSidenav(): void {
    if (this.sidenav) {
      this.sidenav.toggle();
    }
  }

  private showSnackBar(message: string, action: string, type: string): void {
    this.snackBar.open(message, action, {
      duration: 5000,
      panelClass: [`snackbar-${type}`]
    });
  }
}