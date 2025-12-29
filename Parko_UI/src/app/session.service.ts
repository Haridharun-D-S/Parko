import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class SessionService {

  SESSION_DURATION = 5 * 60 * 1000;

  constructor(private router: Router) {}

  startSession(role: string, token?: string) {
    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + this.SESSION_DURATION;

    localStorage.setItem('role', role);
    localStorage.setItem('session_id', sessionId);
    localStorage.setItem('session_expires_at', expiresAt.toString());

    if (token) {
      localStorage.setItem('auth_token', token);
    }

    sessionStorage.setItem('active_session_id', sessionId);
  }

  // 🔑 REQUIRED FOR GUARDS & INTERCEPTOR
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getRole(): string | null {
    return localStorage.getItem('role');
  }

  isSessionValid(): boolean {
    const expiresAt = Number(localStorage.getItem('session_expires_at'));
    const globalSessionId = localStorage.getItem('session_id');
    const tabSessionId = sessionStorage.getItem('active_session_id');
    const token = localStorage.getItem('auth_token');

    // no token → invalid
    if (!token) {
      this.destroySession(false);
      return false;
    }

    // expired
    if (!expiresAt || Date.now() > expiresAt) {
      this.destroySession();
      return false;
    }

    // another tab logged in
    if (!globalSessionId || globalSessionId !== tabSessionId) {
      this.destroySession(false);
      return false;
    }

    return true;
  }

  destroySession(redirect = true) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('role');
    localStorage.removeItem('session_id');
    localStorage.removeItem('session_expires_at');

    sessionStorage.removeItem('active_session_id');

    if (redirect) {
      this.router.navigate(['/login']);
    }
  }
}
