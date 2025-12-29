import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class IoTApi {

  private apiUrl = 'https://localhost:7089/api/iot/signal';

  constructor(private http: HttpClient) {}

  sendSignal(slotId: string, signal: 0 | 1) {
    return this.http.post(this.apiUrl, { slotId, signal });
  }
}
