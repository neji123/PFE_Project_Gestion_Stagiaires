import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EspaceStagiaireComponent } from './espace-stagiaire.component';

describe('EspaceStagiaireComponent', () => {
  let component: EspaceStagiaireComponent;
  let fixture: ComponentFixture<EspaceStagiaireComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EspaceStagiaireComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EspaceStagiaireComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
