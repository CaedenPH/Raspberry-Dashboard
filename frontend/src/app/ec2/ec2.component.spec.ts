import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Ec2Component } from './ec2.component';

describe('Ec2Component', () => {
  let component: Ec2Component;
  let fixture: ComponentFixture<Ec2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ec2Component]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(Ec2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
