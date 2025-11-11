import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsTabComponent } from './reports-tab.component';

describe('ReportsTabComponent', () => {
  let component: ReportsTabComponent;
  let fixture: ComponentFixture<ReportsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsTabComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
