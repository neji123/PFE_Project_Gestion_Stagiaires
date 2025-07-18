import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportUploadDialogComponent } from './report-upload-dialog.component';

describe('ReportUploadDialogComponent', () => {
  let component: ReportUploadDialogComponent;
  let fixture: ComponentFixture<ReportUploadDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportUploadDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportUploadDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
