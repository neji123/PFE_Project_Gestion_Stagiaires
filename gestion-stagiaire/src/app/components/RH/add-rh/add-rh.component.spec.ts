import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddRHComponent } from './add-rh.component';

describe('AddRHComponent', () => {
  let component: AddRHComponent;
  let fixture: ComponentFixture<AddRHComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddRHComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddRHComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
