import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HospitalRegistration } from './hospital-registration';

describe('HospitalRegistration', () => {
  let component: HospitalRegistration;
  let fixture: ComponentFixture<HospitalRegistration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HospitalRegistration]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HospitalRegistration);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
