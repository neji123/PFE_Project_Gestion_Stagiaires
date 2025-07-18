import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MesStagiairesComponent } from './mes-stagiaires.component';

describe('MesStagiairesComponent', () => {
  let component: MesStagiairesComponent;
  let fixture: ComponentFixture<MesStagiairesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesStagiairesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MesStagiairesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
