import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PendingEventsService {

  private apiUrl = 'https://localhost:7089/api/pending-events';

  constructor(private http: HttpClient) {}

  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    };
  }

  getPendingEvents() {
    return this.http.get<any[]>(this.apiUrl, this.getAuthHeaders());
  }
}
