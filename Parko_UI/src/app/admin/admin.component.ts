import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../session.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit, OnDestroy {

  /* ---------------- SESSION ---------------- */

  remainingTime = '';
  private timerInterval: any;

  /* ---------------- UI MESSAGES ---------------- */

  errorMessage = '';
  successMessage = '';

  /* ---------------- USERS ---------------- */

  users: any[] = [];

  newUser = {
    username: '',
    password: '',
    role: 'attendant'
  };

  editingUserId: number | null = null;

  apiUrl = 'https://localhost:7089/api/admin/users';

  constructor(
    private session: SessionService,
    private http: HttpClient,
    private location: Location
  ) {}

  ngOnInit() {
    this.startCountdown();
    this.loadUsers();
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  logout() {
    this.location.back();
  }

  /* ---------------- SESSION TIMER ---------------- */

  startCountdown() {
    this.updateTime();
    this.timerInterval = setInterval(() => this.updateTime(), 1000);
  }

  updateTime() {
    const expiresAt = Number(localStorage.getItem('session_expires_at'));

    if (!expiresAt) {
      this.session.destroySession();
      return;
    }

    const diff = expiresAt - Date.now();
    if (diff <= 0) {
      this.remainingTime = '00:00';
      this.session.destroySession();
      return;
    }

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    this.remainingTime =
      `${minutes.toString().padStart(2, '0')}:` +
      `${seconds.toString().padStart(2, '0')}`;
  }

  /* ---------------- CRUD ---------------- */

  loadUsers() {
    this.clearMessages();
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: res => {
        this.users = res.filter(u => u.role !== 'admin');
      },
      error: err => this.handleError(err)
    });
  }

  addUser() {
    if (!this.newUser.username || !this.newUser.password) {
      this.errorMessage = 'Username and password are required.';
      return;
    }

    this.clearMessages();

    this.http.post(this.apiUrl, this.newUser).subscribe({
      next: () => {
        this.successMessage = 'User added successfully.';
        this.resetForm();
        this.loadUsers();
      },
      error: err => this.handleError(err)
    });
  }

  editUser(user: any) {
    this.clearMessages();
    this.editingUserId = user.id;
    this.newUser = {
      username: user.username,
      password: '',
      role: user.role
    };
  }

  updateUser() {
    if (this.editingUserId === null) return;

    this.clearMessages();

    this.http.put(`${this.apiUrl}/${this.editingUserId}`, this.newUser).subscribe({
      next: () => {
        this.successMessage = 'User updated successfully.';
        this.resetForm();
        this.loadUsers();
      },
      error: err => this.handleError(err)
    });
  }

  deleteUser(id: number) {
    if (!confirm('Delete this user?')) return;

    this.clearMessages();

    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        this.successMessage = 'User deleted successfully.';
        this.loadUsers();
      },
      error: err => this.handleError(err)
    });
  }

  /* ---------------- HELPERS ---------------- */

  resetForm() {
    this.editingUserId = null;
    this.newUser = {
      username: '',
      password: '',
      role: 'attendant'
    };
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  handleError(error: HttpErrorResponse) {
    if (error.error?.message) {
      this.errorMessage = error.error.message;
    } else if (typeof error.error === 'string') {
      this.errorMessage = error.error;
    } else {
      this.errorMessage = 'Something went wrong. Please try again.';
    }
  }
}
