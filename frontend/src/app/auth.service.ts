import { Injectable } from '@angular/core';
import axios from 'axios';
import { Buffer } from 'buffer';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  login(email: string, password: string) {
    axios
      .post('http://0.0.0.0:18080/login', {
        headers: {
          Authorization:
            'basic:' +
            Buffer.from(email + ':' + password, 'binary').toString('base64'),
        },
      })
      .then((respone) => {
        if (respone.status == 200) {
          return true;
        } else {
          return false;
        }
      });
  }

  constructor() {}
}
