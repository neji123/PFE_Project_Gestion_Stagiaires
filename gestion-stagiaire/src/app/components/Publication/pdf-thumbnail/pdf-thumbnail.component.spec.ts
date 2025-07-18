import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfThumbnailComponent } from './pdf-thumbnail.component';

describe('PdfThumbnailComponent', () => {
  let component: PdfThumbnailComponent;
  let fixture: ComponentFixture<PdfThumbnailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfThumbnailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfThumbnailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
