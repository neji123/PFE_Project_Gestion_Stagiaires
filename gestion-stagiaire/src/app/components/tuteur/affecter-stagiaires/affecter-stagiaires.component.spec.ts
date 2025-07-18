import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AffecterStagiairesComponent } from './affecter-stagiaires.component';

describe('AffecterStagiairesComponent', () => {
  let component: AffecterStagiairesComponent;
  let fixture: ComponentFixture<AffecterStagiairesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AffecterStagiairesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AffecterStagiairesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
