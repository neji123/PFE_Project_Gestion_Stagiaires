import { TestBed } from '@angular/core/testing';

import { IiiService } from './iii.service';

describe('IiiService', () => {
  let service: IiiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IiiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
