import { Component, OnInit } from '@angular/core';
import { CommonModule,Location } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { PendingEventsService } from '../services/pending-events.service';

@Component({
  selector: 'app-attendant-options',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './attendant-options.component.html',
  styleUrls: ['./attendant-options.component.scss']
})
export class AttendantOptionsComponent implements OnInit {

  private slotsUrl = 'https://localhost:7089/api/ParkedVehicles/available-slots';
  private TOTAL_SLOTS_PER_ZONE = 15;
  zones = ['A','B','C','D'];
  username = localStorage.getItem('username') || 'Attendant';
  pendingEvents: any[] = [];

  slotSummary: Array<{
    zone: string;
    capacity: number;
    occupied: number;
    free: number;
  }> = [];

  constructor(
    private router: Router,
    private http: HttpClient,
    private location:Location,
    private pendingService: PendingEventsService
  ) {}

  ngOnInit() {
    this.loadAvailability();
    this.loadPendingEvents();
    setInterval(() => {
    this.loadPendingEvents();
    this.loadAvailability();
  }, 5000);
  }
  /**
 * Creates visual slot segments based on capacity & occupied
 * true  = occupied (filled)
 * false = free
 */
getSlotSegments(capacity: number, occupied: number): boolean[] {
  return Array.from({ length: capacity }, (_, i) => i < occupied);
}

  // ---------- NAV ----------
  goToEntry() {
    this.router.navigate(['/entry']);
  }

  goToExit() {
    this.router.navigate(['/exit']);
  }
  goToMaintenance() {
  this.router.navigate(['/slot-management']); 
}
  goBack() {
    this.location.back();
  }
  handlePending(event: any) {
  if (event.eventType === 'ENTRY') {
    this.router.navigate(['/entry'], {
      queryParams: { slotId: event.slotId, pendingId: event.id }
    });
  }

  if (event.eventType === 'EXIT') {
    this.router.navigate(['/exit'], {
      queryParams: { pendingId: event.id }
    });
  }
}


  // ---------- AUTH ----------
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'text' as const
    };
  }

  // ---------- DATA ----------
  loadPendingEvents() {
  this.pendingService.getPendingEvents().subscribe({
    next: events => {
      this.pendingEvents = events;
      console.log('Pending events:', events);
    },
    error: err => {
      console.error('Failed to load pending events', err);
    }
  });
}

  async loadAvailability() {
    try {
      const text = await lastValueFrom(
        this.http.get(this.slotsUrl, this.getAuthHeaders())
      );
      
      const json = JSON.parse(text);
      const freeSlots: string[] = json?.availableSlots ?? json ?? [];
          console.log('PARSED FREE SLOTS:', freeSlots); // 🔥 ADD THIS

      this.slotSummary = this.zones.map(z => {
        const free = freeSlots.filter(s => s.startsWith(z)).length;
        return {
          zone: z,
          capacity: this.TOTAL_SLOTS_PER_ZONE,
          free,
          occupied: this.TOTAL_SLOTS_PER_ZONE - free
        };
      });
    } catch (err) {
      console.error('Failed to load availability', err);
    }
  }
}
