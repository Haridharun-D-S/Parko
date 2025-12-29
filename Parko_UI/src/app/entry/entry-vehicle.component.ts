import {
  Component,
  OnInit,
  ViewChild,
  ElementRef
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-entry-vehicle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './entry-vehicle.component.html',
  styleUrls: ['./entry-vehicle.component.scss'],
})
export class EntryVehicleComponent implements OnInit {

  apiUrl = 'https://localhost:7089/api/ParkedVehicles';

  vehicleNumber = '';
  ownerName = '';
  message = '';
  assignedSlot: string | null = null;

  vehicleTouched = false;
  ownerTouched = false;
  showFillAllError = false;

  slotId: string | null = null;
  pendingId: number | null = null;

  // 📷 IMAGE STATE (camera OR upload)
  cameraOpen = false;
  capturedImage: string | null = null;
  videoStream?: MediaStream;
  mlInProgress = false;

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private VEHICLE_REGEX = /^[A-Z]{2}\s\d{2}\s[A-Z]{2}\s\d{4}$/;

  constructor(
    private http: HttpClient,
    private location: Location,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    
    this.route.queryParams.subscribe(params => {
      this.slotId = params['slotId'] || null;
      this.pendingId = params['pendingId']
        ? Number(params['pendingId'])
        : null;
    });
  }

  goBack() {
    this.location.back();
  }

  logout() {
    localStorage.clear();
    window.location.href = '/login';
  }

  // ================= CAMERA =================
  async openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      this.videoStream = stream;
      this.videoRef.nativeElement.srcObject = stream;
      this.cameraOpen = true;
    } catch {
      this.message = '❌ Camera not accessible';
    }
  }

  capturePhoto() {
    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    this.capturedImage = canvas.toDataURL('image/jpeg', 0.9);
    this.stopCamera();
  }

  stopCamera() {
    this.videoStream?.getTracks().forEach(t => t.stop());
    this.videoStream = undefined;
    this.cameraOpen = false;
  }
  selectedFileName = '';

// onFileSelected(event: any) {
//   const file = event.target.files[0];
//   if (file) {
//     this.selectedFileName = file.name;
//   }
// }

  // ================= FILE UPLOAD =================
  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.capturedImage = reader.result as string;
      this.message = '📁 Image uploaded successfully';
    };
    reader.readAsDataURL(file);
  }

  clearImage() {
    this.capturedImage = null;
  }

  // ================= OCR =================
  runOCR() {
    if (!this.capturedImage || this.mlInProgress) return;

    this.mlInProgress = true;
    this.message = '🔍 Reading number plate...';

    const blob = this.base64ToBlob(this.capturedImage);
    const formData = new FormData();
    formData.append('file', blob, 'plate.jpg');

    this.http.post<any>('http://localhost:8001/ocr/plate', formData)
      .subscribe({
        next: res => {
          if (res.success && res.plate && !this.vehicleNumber) {
            this.vehicleNumber = res.plate;
            this.message = '✅ Plate detected (verify before submit)';
          } else {
            this.message = '⚠️ Plate not detected, enter manually';
          }
          this.mlInProgress = false;
        },
        error: () => {
          this.message = '❌ OCR service unavailable';
          this.mlInProgress = false;
        }
      });
  }

  base64ToBlob(base64: string): Blob {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: 'image/jpeg' });
  }

  // ================= INPUT =================
  onVehicleInput(e: Event) {
    this.vehicleTouched = true;
    let v = (e.target as HTMLInputElement).value
      .toUpperCase().replace(/[^A-Z0-9]/g, '');

    const out = `${v.slice(0,2)} ${v.slice(2,4)} ${v.slice(4,6)} ${v.slice(6,10)}`.trim();
    this.vehicleNumber = out.slice(0, 13);
  }

  isVehicleValid() {
    return this.VEHICLE_REGEX.test(this.vehicleNumber);
  }
  private resetFormState(options?: { keepSuccessMessage?: boolean }) {
  // Inputs
  this.vehicleNumber = '';
  this.ownerName = '';

  // Image & camera
  this.capturedImage = null;
  this.selectedFileName = '';
  this.cameraOpen = false;
  this.mlInProgress = false;

  // Validation flags
  this.vehicleTouched = false;
  this.ownerTouched = false;
  this.showFillAllError = false;

  // Clear messages unless explicitly preserved
  if (!options?.keepSuccessMessage) {
    this.message = '';
  }
}

  // ================= SUBMIT =================
  formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
}

  parkVehicle() {
    if (!this.vehicleNumber || !this.ownerName) {
      this.showFillAllError = true;
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    this.http.post<any>(this.apiUrl, {
      vehicleNumber: this.vehicleNumber.replace(/\s+/g, ''),
      ownerName: this.ownerName,
      imageBase64: this.capturedImage
    }, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: res => {
        this.assignedSlot = res.slotId;
        this.message = `✅ Vehicle parked at slot ${res.slotId}`;
        this.resetFormState({ keepSuccessMessage: true });
      },
      error: () => this.message = '❌ Entry failed'
    });
  }
}
