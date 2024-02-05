import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  login(email: string, password: string) {
    return this.httpClient
      .post<Body>('/api/login', { email, password })
      .pipe(shareReplay());
  }

  constructor(private httpClient: HttpClient) {}
}
