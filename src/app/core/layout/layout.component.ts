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

// No seu layout.component.ts
ngOnInit(): void {
  this.subscriptions.add(
    combineLatest([
      this.authService.isAuthReady$.pipe(filter(isReady => !!isReady)),
      this.authService.currentUser$
    ]).subscribe(([ready, user]) => {
      this.currentUserId = user?.uid || null;
      this.isAuthenticated = !!user;

      if (user) {
        // ✅ Cenário Logado: Puxa o nome do ZeMarcello
        this.apostadorNome = user.displayName || 'Apostador';
        this.carregarDadosDoServidor(); // Chama a função corrigida abaixo
      } else {
        // ✅ Cenário Visitante: Limpa para o modo tour
        this.apostadorNome = 'Convidado';
        this.apostadorSaldo = 0;
      }
    })
  );
}

// ✅ Adicione esta função para buscar o saldo real quando logado
private carregarDadosDoServidor(): void {
  this.apostadorService.getDadosApostador().subscribe(res => {
    if (res.success && res.data) {
      // Lógica de unwrap que você já usa no projeto
      const data = isPreservedCollection<ApostadorDto>(res.data) 
                   ? res.data.$values[0] : res.data as ApostadorDto;
      if (data) {
        this.apostadorSaldo = data.saldo?.valor || 0;
        this.apostadorNome = data.apelido || this.apostadorNome;
      }
    }
  });
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