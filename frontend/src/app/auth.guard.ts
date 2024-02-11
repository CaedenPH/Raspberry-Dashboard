import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';



export const authGuard: CanActivateFn = (route, state) => {
  if(!inject(AuthService).isLoggedin()) {
    inject(Router).navigate(['login']);
    return false;
  }
  return true;
};
