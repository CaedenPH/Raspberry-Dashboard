import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { Ec2Component } from './ec2/ec2.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'ec2', component: Ec2Component },
  { path: 'home', redirectTo: '', pathMatch: 'full' },
];
