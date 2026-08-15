import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoctorSlot } from './doctor-slot';

describe('DoctorSlot', () => {
  let component: DoctorSlot;
  let fixture: ComponentFixture<DoctorSlot>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorSlot]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DoctorSlot);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
