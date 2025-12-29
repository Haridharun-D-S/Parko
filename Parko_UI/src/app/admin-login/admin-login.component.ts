import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { SessionService } from '../session.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.scss']
})
export class AdminLoginComponent {
[x: string]: any;

  username = '';
  password = '';
  errorMessage = '';
  loading = false;

  apiUrl = 'https://localhost:7089/api/Login/authenticate';


  constructor(
    private http: HttpClient,
    private router: Router,
    private session: SessionService
  ) {}
  
  goLogin(){
    this.router.navigateByUrl('/login');
  }

  loginAdmin() {
  if (this.loading) return;   // 👈 prevent double call

  this.errorMessage = '';
  this.loading = true;

  const username = this.username.trim();
  const password = this.password.trim();

  if (!username || !password) {
    this.errorMessage = 'Username and password required';
    this.loading = false;
    return;
  }

  this.http.post<any>(this.apiUrl, { username, password }).subscribe({
    next: (res) => {
      this.loading = false;

      if (!res?.token || !res?.role) {
        this.errorMessage = 'Invalid server response';
        return;
      }

      if (res.role.toLowerCase() !== 'admin') {
        this.errorMessage = 'You are not an admin';
        return;
      }

      this.session.startSession('admin', res.token);
      this.router.navigate(['/admin']);
    },
    error: (err) => {
      this.loading = false;
      this.errorMessage =
        err?.status === 401
          ? 'Invalid admin credentials'
          : 'Server error. Try again.';
    }
  });
}
}
