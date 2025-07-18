import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SprintReportDialogComponent } from './sprint-report-dialog.component';

describe('SprintReportDialogComponent', () => {
  let component: SprintReportDialogComponent;
  let fixture: ComponentFixture<SprintReportDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SprintReportDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SprintReportDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
