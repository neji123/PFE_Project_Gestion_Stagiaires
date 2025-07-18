import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicationCreateComponent } from './publication-create.component';

describe('PublicationCreateComponent', () => {
  let component: PublicationCreateComponent;
  let fixture: ComponentFixture<PublicationCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicationCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublicationCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
