import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailTuteurComponent } from './detail-tuteur.component';

describe('DetailTuteurComponent', () => {
  let component: DetailTuteurComponent;
  let fixture: ComponentFixture<DetailTuteurComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailTuteurComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetailTuteurComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
