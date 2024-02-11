import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { Ec2Component } from './ec2/ec2.component';
import { LoginComponent } from './login/login.component';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'ec2', component: Ec2Component, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent},
  { path: '', redirectTo: 'home', pathMatch: 'full' },
];
