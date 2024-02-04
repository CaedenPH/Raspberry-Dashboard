import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { Ec2Component } from './ec2/ec2.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'ec2', component: Ec2Component },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
];
