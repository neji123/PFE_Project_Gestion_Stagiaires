import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListStagiaireComponent } from './list-stagiaire.component';

describe('ListStagiaireComponent', () => {
  let component: ListStagiaireComponent;
  let fixture: ComponentFixture<ListStagiaireComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListStagiaireComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListStagiaireComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
