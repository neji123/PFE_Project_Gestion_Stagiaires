import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicationItemComponent } from './publication-item.component';

describe('PublicationItemComponent', () => {
  let component: PublicationItemComponent;
  let fixture: ComponentFixture<PublicationItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicationItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublicationItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
