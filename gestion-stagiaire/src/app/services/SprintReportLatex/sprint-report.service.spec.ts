import { TestBed } from '@angular/core/testing';

import { SprintReportService } from './sprint-report.service';

describe('SprintReportService', () => {
  let service: SprintReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SprintReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
