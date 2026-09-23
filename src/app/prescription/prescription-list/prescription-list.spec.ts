import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrescriptionList } from './prescription-list';

describe('PrescriptionList', () => {
  let component: PrescriptionList;
  let fixture: ComponentFixture<PrescriptionList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrescriptionList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrescriptionList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
