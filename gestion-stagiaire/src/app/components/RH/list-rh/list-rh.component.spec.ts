import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListRHComponent } from './list-rh.component';

describe('ListRHComponent', () => {
  let component: ListRHComponent;
  let fixture: ComponentFixture<ListRHComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListRHComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListRHComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
