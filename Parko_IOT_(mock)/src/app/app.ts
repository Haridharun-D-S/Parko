import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface Slot {
  slotId: string;
  isOccupied: boolean;
  isReserved: boolean;
  isBlocked: boolean;
  isExitPending: boolean; // 🔥 REQUIRED
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  template: `
    <h2>🛰 Mock Parking IoT Panel</h2>

    <div class="grid">
      <div
        class="slot-card"
        *ngFor="let s of slots"
        [ngClass]="getSlotClass(s)"
      >
        <div class="slot-id">{{ s.slotId }}</div>

        <div class="state">
          {{ getStateLabel(s) }}
        </div>

        <!-- ENTRY CONFIRM -->
        <button
          *ngIf="isEntryWaiting(s)"
          (click)="confirmEntry(s)">
          🚗 Vehicle Arrived
        </button>

        <!-- EXIT CONFIRM -->
        <button
          *ngIf="isOccupied(s)"
          (click)="confirmExit(s)">
          🚪 Vehicle Left
        </button>
      </div>
    </div>
  `,
  styles: [`
    h2 {
      text-align: center;
      margin: 20px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 16px;
      padding: 20px;
    }

    .slot-card {
      border-radius: 12px;
      padding: 14px;
      text-align: center;
      font-weight: 600;
      color: white;
    }

    .free {
      background: #2e7d32;
    }

    .entry {
      background: #f9a825;
      color: black;
    }

    .occupied {
      background: #c62828;
    }

    .exit {
      background: #ff9800;
      color: black;
    }

    .blocked {
      background: #616161;
    }

    .slot-id {
      font-size: 20px;
      margin-bottom: 8px;
    }

    .state {
      margin-bottom: 10px;
    }

    button {
      width: 100%;
      padding: 8px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
    }
  `]
})
export class App implements OnInit {

  slots: Slot[] = [];

  private slotsApi = 'https://localhost:7089/api/Slots';
  private iotApi   = 'https://localhost:7089/api/iot/signal';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadSlots();
    setInterval(() => this.loadSlots(), 4000); // auto refresh
  }

  loadSlots() {
    this.http.get<Slot[]>(this.slotsApi).subscribe({
      next: data => this.slots = data
    });
  }

  // ================= STATE CHECKS =================

  isFree(s: Slot) {
    return !s.isOccupied && !s.isReserved && !s.isBlocked && !s.isExitPending;
  }

  isEntryWaiting(s: Slot) {
    return !s.isOccupied && s.isReserved && !s.isBlocked;
  }

  isOccupied(s: Slot) {
    return s.isOccupied;
  }

  isExitWaiting(s: Slot) {
    return s.isExitPending;
  }

  // ================= UI HELPERS =================

  getSlotClass(s: Slot) {
    if (s.isBlocked) return 'blocked';
    if (this.isExitWaiting(s)) return 'exit';
    if (this.isEntryWaiting(s)) return 'entry';
    if (this.isOccupied(s)) return 'occupied';
    return 'free';
  }

  getStateLabel(s: Slot) {
    if (s.isBlocked) return 'BLOCKED';
    if (this.isExitWaiting(s)) return 'EXIT WAITING';
    if (this.isEntryWaiting(s)) return 'ENTRY WAITING';
    if (this.isOccupied(s)) return 'OCCUPIED';
    return 'FREE';
  }

  // ================= IOT SIGNALS =================

  confirmEntry(slot: Slot) {
    this.http.post(this.iotApi, {
      slotId: slot.slotId,
      signal: 'ENTRY'
    }).subscribe(() => this.loadSlots());
  }

  confirmExit(slot: Slot) {
    this.http.post(this.iotApi, {
      slotId: slot.slotId,
      signal: 'EXIT'
    }).subscribe(() => this.loadSlots());
  }
}
