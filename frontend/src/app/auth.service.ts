import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import axios from 'axios';

@Injectable({
  providedIn: 'root',
})
export class AuthService {


  constructor(
    private router: Router,
  ) {}

  public login(email: string, password: string) {
    axios
      .post('/login', {},
      {
        headers: {
          Authorization:
            'basic:' +
            Buffer.from(email + ':' + password, 'binary').toString('base64'),
        },
      })
      .then((respone) => {
        if (respone.status == 200) {
          localStorage.setItem("token", "makethisjwtsoonpls");
          this.router.navigate(['/']);
        }
    });

  }
  public isLoggedin(): boolean {
    let token = localStorage.getItem("token");
    //TODO: validate the token
    return token != null && token.length > 0;
  }

}
