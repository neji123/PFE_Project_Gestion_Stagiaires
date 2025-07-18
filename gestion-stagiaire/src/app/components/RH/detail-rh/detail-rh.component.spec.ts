import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailRhComponent } from './detail-rh.component';

describe('DetailRHComponent', () => {
  let component: DetailRhComponent;
  let fixture: ComponentFixture<DetailRhComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailRhComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetailRhComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
