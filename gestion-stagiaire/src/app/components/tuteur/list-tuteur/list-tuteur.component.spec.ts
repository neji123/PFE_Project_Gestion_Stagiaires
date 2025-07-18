import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListTuteurComponent } from './list-tuteur.component';

describe('ListTuteurComponent', () => {
  let component: ListTuteurComponent;
  let fixture: ComponentFixture<ListTuteurComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListTuteurComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListTuteurComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
