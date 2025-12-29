import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Location } from '@angular/common';

interface Slot {
  slotId: string;
  isBlocked: boolean;
  isOccupied: boolean;
}

@Component({
  selector: 'app-slot-management',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './slot-management.html',
  styleUrls: ['./slot-management.scss']
})
export class SlotManagementComponent implements OnInit {

  private slotApi = 'https://localhost:7089/api/Slots';
  slots: Slot[] = [];
  zones = ['A', 'B', 'C', 'D'];
  activeZone: string = 'A';

  constructor(private http: HttpClient, private location: Location) {}

  goBack() {
    this.location.back();
  }
  logout(){
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  }
  

  getSlotsForZone(zone: string) {
    return this.slots.filter(s => s.slotId.startsWith(zone));
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  async loadSlots() {
  try {
    this.slots = await lastValueFrom(
      this.http.get<Slot[]>(this.slotApi, this.getAuthHeaders())
    );
  } catch (err) {
    console.error('Failed to load slots', err);
  }
}
ngOnInit() {
  this.loadSlots();
}



  async toggleBlock(slot: Slot) {
    if (slot.isOccupied) return;

    const action = slot.isBlocked ? 'unblock' : 'block';

    await lastValueFrom(
      this.http.put(
        `${this.slotApi}/${slot.slotId}/${action}`,
        {},
        this.getAuthHeaders()
      )
    );

    slot.isBlocked = !slot.isBlocked;
  }
}
