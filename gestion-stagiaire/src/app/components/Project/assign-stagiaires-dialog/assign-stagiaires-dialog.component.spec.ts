import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignStagiairesDialogComponent } from './assign-stagiaires-dialog.component';

describe('AssignStagiairesDialogComponent', () => {
  let component: AssignStagiairesDialogComponent;
  let fixture: ComponentFixture<AssignStagiairesDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignStagiairesDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignStagiairesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
