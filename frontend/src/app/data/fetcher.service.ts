import { Injectable } from '@angular/core';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class FetcherService {

  constructor() { }

  public fetch(endpoint: string) {
    axios.get(
      endpoint
    ).then((response) => {
      return response.data;
    })
  }
}
