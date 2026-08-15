import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HospitalsList } from './hospitals-list';

describe('HospitalsList', () => {
  let component: HospitalsList;
  let fixture: ComponentFixture<HospitalsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HospitalsList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HospitalsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
