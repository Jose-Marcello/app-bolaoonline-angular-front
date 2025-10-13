import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RankingCampeonatoComponent } from './ranking-campeonato.component';

describe('RankingCampeonatoComponent', () => {
  let component: RankingCampeonatoComponent;
  let fixture: ComponentFixture<RankingCampeonatoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RankingCampeonatoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RankingCampeonatoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
