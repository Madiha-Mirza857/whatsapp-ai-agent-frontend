import { TestBed } from '@angular/core/testing';

import { DoctorSlotService } from './doctor-slot-service';

describe('DoctorSlotService', () => {
  let service: DoctorSlotService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DoctorSlotService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
