import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MesProjetsComponent } from './mes-projets.component';

describe('MesProjetsComponent', () => {
  let component: MesProjetsComponent;
  let fixture: ComponentFixture<MesProjetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesProjetsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MesProjetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
