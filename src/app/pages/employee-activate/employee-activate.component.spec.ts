import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeActivateComponent } from './employee-activate.component';

describe('EmployeeActivateComponent', () => {
  let component: EmployeeActivateComponent;
  let fixture: ComponentFixture<EmployeeActivateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeActivateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeActivateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
