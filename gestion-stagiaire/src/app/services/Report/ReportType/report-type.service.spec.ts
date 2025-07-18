import { TestBed } from '@angular/core/testing';

import { ReportTypeService } from './report-type.service';

describe('ReportTypeService', () => {
  let service: ReportTypeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReportTypeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
