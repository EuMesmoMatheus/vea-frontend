import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgendaTabComponent } from './agenda-tab.component';

describe('AgendaTabComponent', () => {
  let component: AgendaTabComponent;
  let fixture: ComponentFixture<AgendaTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgendaTabComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgendaTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
