import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterOutlet,
  NavigationStart,
  NavigationEnd
} from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Subscription } from 'rxjs';

import { HeaderComponent } from './components/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HttpClientModule,
    HeaderComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class AppComponent implements OnInit, OnDestroy {

  role: string = localStorage.getItem('role') || '';
  showHeader = true;

  // ---------------- LOADER ----------------
  isLoading = true;
  private dataReady = false;
  private loaderEndTime = 0;
  private readonly LOADER_DURATION = 2000; // 👈 MASTER CONTROL (ms)

  private sub!: Subscription;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    if (!sessionStorage.getItem('initialized')) {
      localStorage.clear();
      sessionStorage.setItem('initialized', 'true');
    }
  }

  ngOnInit(): void {

    // App start loader
    this.startLoader();

    this.initializeApp();

    this.sub = this.router.events.subscribe(event => {

      if (event instanceof NavigationStart) {
        this.dataReady = false;
        this.startLoader();
      }

      if (event instanceof NavigationEnd) {
        this.dataReady = true;
        this.checkLoader();

        const url = event.urlAfterRedirects || event.url;

        document.body.classList.remove(
          'bg-login',
          'bg-admin-login',
          'bg-attendant-options',
          'bg-entry',
          'bg-exit',
          'bg-slot',
          'bg-admin',
          'bg-supervisor'
        );

        if (url.includes('admin-login')) document.body.classList.add('bg-admin-login');
        else if (url.includes('login')) document.body.classList.add('bg-login');
        else if (url.includes('attendant-options')) document.body.classList.add('bg-attendant-options');
        else if (url.includes('entry')) document.body.classList.add('bg-entry');
        else if (url.includes('exit')) document.body.classList.add('bg-exit');
        else if (url.includes('slot-management')) document.body.classList.add('bg-slot');
        else if (url.includes('admin')) document.body.classList.add('bg-admin');
        else if (url.includes('supervisor')) document.body.classList.add('bg-supervisor');
      }
    });
  }

  // ---------------- APP INIT ----------------
  initializeApp() {
    // Put startup API calls here
    this.dataReady = true;
    this.checkLoader();
  }

  // ---------------- LOADER ENGINE ----------------
  private startLoader() {
    this.isLoading = true;
    this.loaderEndTime = Date.now() + this.LOADER_DURATION;
    this.checkLoader();
  }

  private checkLoader() {
    if (!this.isLoading) return;

    const remaining = this.loaderEndTime - Date.now();

    if (remaining <= 0 && this.dataReady) {
      this.isLoading = false;
      return;
    }

    requestAnimationFrame(() => this.checkLoader());
  }

  // ---------------- LOGOUT ----------------
  logout() {
    this.http.post(
      'http://localhost:7089/api/Login/logout',
      {},
      { withCredentials: true }
    ).subscribe({
      next: () => {
        localStorage.clear();
        sessionStorage.clear();
        this.router.navigate(['/login']);
      },
      error: err => console.error('Logout failed:', err)
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
