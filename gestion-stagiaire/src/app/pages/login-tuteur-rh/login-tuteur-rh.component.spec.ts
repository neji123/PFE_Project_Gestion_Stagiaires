import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginTuteurRhComponent } from './login-tuteur-rh.component';

describe('LoginTuteurRhComponent', () => {
  let component: LoginTuteurRhComponent;
  let fixture: ComponentFixture<LoginTuteurRhComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginTuteurRhComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginTuteurRhComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
