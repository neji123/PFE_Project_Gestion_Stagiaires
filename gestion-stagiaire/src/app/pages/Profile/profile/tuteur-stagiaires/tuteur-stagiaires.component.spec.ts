import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TuteurStagiairesComponent } from './tuteur-stagiaires.component';

describe('TuteurStagiairesComponent', () => {
  let component: TuteurStagiairesComponent;
  let fixture: ComponentFixture<TuteurStagiairesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TuteurStagiairesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TuteurStagiairesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
