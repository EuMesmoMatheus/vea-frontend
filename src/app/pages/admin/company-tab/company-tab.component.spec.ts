import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyTabComponent } from './company-tab.component';

describe('CompanyTabComponent', () => {
  let component: CompanyTabComponent;
  let fixture: ComponentFixture<CompanyTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyTabComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompanyTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
