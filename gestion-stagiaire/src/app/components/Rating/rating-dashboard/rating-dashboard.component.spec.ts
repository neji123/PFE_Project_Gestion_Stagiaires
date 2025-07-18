import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RatingDashboardComponent } from './rating-dashboard.component';

describe('RatingDashboardComponent', () => {
  let component: RatingDashboardComponent;
  let fixture: ComponentFixture<RatingDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatingDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RatingDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
