import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LatexAttestationComponent } from './latex-attestation.component';

describe('LatexAttestationComponent', () => {
  let component: LatexAttestationComponent;
  let fixture: ComponentFixture<LatexAttestationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LatexAttestationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LatexAttestationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
