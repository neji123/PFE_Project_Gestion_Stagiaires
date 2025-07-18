import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportTypesAdminComponent } from './report-types-admin.component';

describe('ReportTypesAdminComponent', () => {
  let component: ReportTypesAdminComponent;
  let fixture: ComponentFixture<ReportTypesAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportTypesAdminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportTypesAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
