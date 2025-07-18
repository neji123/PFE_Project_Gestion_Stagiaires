import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicationFeedComponent } from './publication-feed.component';

describe('PublicationFeedComponent', () => {
  let component: PublicationFeedComponent;
  let fixture: ComponentFixture<PublicationFeedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicationFeedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublicationFeedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
