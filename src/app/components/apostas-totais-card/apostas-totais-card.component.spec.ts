import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApostasTotaisCardComponent } from './apostas-totais-card.component';

describe('ApostasTotaisCardComponent', () => {
  let component: ApostasTotaisCardComponent;
  let fixture: ComponentFixture<ApostasTotaisCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApostasTotaisCardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ApostasTotaisCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
