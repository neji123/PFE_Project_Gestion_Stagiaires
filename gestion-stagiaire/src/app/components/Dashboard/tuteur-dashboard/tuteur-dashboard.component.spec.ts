import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TuteurDashboardComponent } from './tuteur-dashboard.component';

describe('TuteurDashboardComponent', () => {
  let component: TuteurDashboardComponent;
  let fixture: ComponentFixture<TuteurDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TuteurDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TuteurDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
