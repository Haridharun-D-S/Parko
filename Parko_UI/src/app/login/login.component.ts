import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterLink, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterLink, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  username = '';
  password = '';
  role = 'attendant'; // selected role (UI only)
  errorMessage = '';

  apiUrl = 'https://localhost:7089/api/Login';

  constructor(private http: HttpClient, private router: Router) {}

  login() {
    const username = this.username.trim();
    const password = this.password.trim();
    const selectedRole = this.role.trim().toLowerCase();

    this.errorMessage = '';

    if (!username || !password || !selectedRole) {
      this.errorMessage = 'All fields are required';
      return;
    }

    // 🔑 DO NOT send role to backend
    this.http.post<any>(`${this.apiUrl}/authenticate`, {
      username,
      password
    }).subscribe({
      next: (res) => {
        console.log('Response:',res);
        if (!res?.token || !res?.role) {
          this.errorMessage = 'Invalid server response';
          console.error('Login response invalid:', res);
          return;
        }

        const serverRole = res.role.toLowerCase();

        // UI role validation (UX only)
        if (serverRole !== selectedRole) {
          this.errorMessage = 'Role mismatch — access denied';
          return;
        }

        // Save auth data
        localStorage.setItem('auth_token', res.token);
        localStorage.setItem('role', serverRole);
        localStorage.setItem('username', res.username ?? username);

        // Navigate by role
        if (serverRole === 'attendant') {
console.log('BEFORE NAV');
this.router.navigate(['/attendant-options']).then(r =>
  console.log('NAV RESULT:', r)
);
        } else if (serverRole === 'supervisor') {
          this.router.navigate(['/supervisor']);
        } else if (serverRole === 'admin') {
          this.router.navigate(['/admin']);
        } else {
          this.errorMessage = 'Unknown role';
        }
      },
      error: (err) => {
        console.error('Login error', err);
        this.errorMessage =
          err?.error?.message ||
          (err.status === 401 ? 'Invalid credentials' : 'Server error');
      }
    });
  }
}
