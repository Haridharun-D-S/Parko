import {
  Component,
  OnInit,
  ViewChild,
  ElementRef
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

interface ExitResponse {
  vehicleNumber?: string | null;
  ownerName?: string | null;
  slotId?: string;
  parkingFee?: number;
  entryTime?: string;
  exitTime?: string;
  totalTimeInMinutes?: number;
  [key: string]: any;
}

@Component({
  selector: 'app-exit-vehicle',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './exit-vehicle.component.html',
  styleUrls: ['./exit-vehicle.component.scss']
})
export class ExitVehicleComponent implements OnInit {

  // ================= API =================
  apiUrl = 'https://localhost:7089/api/ParkedVehicles';

  // ================= IOT CONTEXT =================
  pendingId: number | null = null;

  // ================= FORM =================
  exitVehicleNumber = '';
  exitOwnerName = '';

  // ================= UI STATE =================
  message = '';
  billAmount: number | null = null;
  assignedSlot: string | null = null;
  entryTime: string | null = null;
  exitTime: string | null = null;
  minutes: number | null = null;

  private lastExitPayload: ExitResponse | null = null;

  vehicleTouched = false;
  ownerTouched = false;

  // ================= CAMERA =================
  cameraOpen = false;
  capturedImage: string | null = null;
  videoStream?: MediaStream;

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private VEHICLE_REGEX = /^[A-Z]{2}\s\d{2}\s[A-Z]{2}\s\d{4}$/;

  constructor(
    private http: HttpClient,
    private location: Location,
    private route: ActivatedRoute
  ) {}

  // ================= INIT =================
  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.pendingId = params['pendingId']
        ? Number(params['pendingId'])
        : null;
    });
  }

  // ================= NAV =================
  goBack() {
    this.location.back();
  }

  logout() {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  }

  // ================= INPUT FORMAT =================
  onVehicleInput(event: Event) {
    this.vehicleTouched = true;
    const input = event.target as HTMLInputElement;

    const cleaned = (input.value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    this.exitVehicleNumber = this.formatVehicle(cleaned);
    input.value = this.exitVehicleNumber;
  }

  onVehiclePaste(e: ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData?.getData('text') || '';
    const cleaned = pasted.toUpperCase().replace(/[^A-Z0-9]/g, '');
    this.exitVehicleNumber = this.formatVehicle(cleaned);
  }

  private formatVehicle(v: string): string {
    const a = v.slice(0, 2);
    const b = v.slice(2, 4);
    const c = v.slice(4, 6);
    const d = v.slice(6, 10);

    let out = a;
    if (b) out += ' ' + b;
    if (c) out += ' ' + c;
    if (d) out += ' ' + d;

    return out.slice(0, 13);
  }

  private calculateMinutes(entry: string | null, exit: string | null): number {
    if (!entry || !exit) return 0;
    const start = new Date(entry).getTime();
    const end = new Date(exit).getTime();
    return Math.max(1, Math.ceil((end - start) / 60000));
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
      this.message = '❌ Unable to access camera';
    }
  }

  capturePhoto() {
    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);
    this.capturedImage = canvas.toDataURL('image/jpeg', 0.85);

    this.stopCamera();
  }

  private stopCamera() {
    this.videoStream?.getTracks().forEach(t => t.stop());
    this.videoStream = undefined;
    if (this.videoRef) this.videoRef.nativeElement.srcObject = null;
    this.cameraOpen = false;
  }

  onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];

  if (!file.type.startsWith('image/')) {
    this.message = '❌ Please upload a valid image';
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    this.capturedImage = reader.result as string;
    this.message = '🖼 Image uploaded. Ready for OCR';
  };

  reader.readAsDataURL(file);
}


  // ================= OCR =================
  runOCR() {
    if (!this.capturedImage) {
      this.message = '❌ Capture image first';
      return;
    }

    this.message = '🔍 Reading number plate...';

    const blob = this.base64ToBlob(this.capturedImage);
    const formData = new FormData();
    formData.append('file', blob, 'plate.jpg');

    this.http.post<any>('http://localhost:8001/ocr/plate', formData)
      .subscribe({
        next: res => {
          if (res.success && res.plate && !this.exitVehicleNumber) {
            this.exitVehicleNumber = res.plate;
            this.message = '✅ Plate detected (verify before exit)';
          } else {
            this.message = '⚠️ Plate not detected';
          }
        },
        error: () => {
          this.message = '❌ Plate could not be detected. Please enter manually';
        }
      });
  }

  private base64ToBlob(base64: string): Blob {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: 'image/jpeg' });
  }

  // ================= EXIT LOGIC =================
  exitVehicle() {
    const normalized = this.exitVehicleNumber.replace(/[^A-Z0-9]/g, '');
    const formatted = this.formatVehicle(normalized);

    if (!this.VEHICLE_REGEX.test(formatted)) {
      this.message = '❌ Invalid vehicle format';
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      this.message = '❌ Session expired';
      return;
    }

    this.message = '⏳ Processing exit...';

    this.http.post<ExitResponse>(
  `${this.apiUrl}/exit`,
  {
    vehicleNumber: normalized,
    ownerName: this.exitOwnerName.trim(), // 🔐 soft token
    pendingId: this.pendingId
  },
  { headers: { Authorization: `Bearer ${token}` } }
)
.subscribe({
      next: res => {
        this.lastExitPayload = res;
        this.billAmount = res.parkingFee ?? 0;
        this.assignedSlot = res.slotId ?? null;
        this.entryTime = res.entryTime ?? null;
        this.exitTime = res.exitTime ?? new Date().toISOString();
        this.minutes =res.totalTimeInMinutes ?? this.calculateMinutes(this.entryTime, this.exitTime);
        this.message = `✅ Vehicle exited. Fee ₹${this.billAmount}`;
        this.exitVehicleNumber = '';
        this.exitOwnerName = '';
      },
      error: () => this.message = '❌ Exit failed'
    });
  }

  // ================= RECEIPT =================
previewReceipt() {
  if (!this.lastExitPayload) return;

  const p = this.lastExitPayload;
  const now = new Date().toLocaleString();

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Parking Receipt</title>
    <style>
      body {
        font-family: Arial, Helvetica, sans-serif;
        background: #f4f4f4;
        padding: 20px;
      }
      .receipt {
        max-width: 380px;
        margin: auto;
        background: #fff;
        border: 1px solid #ddd;
        padding: 20px;
        border-radius: 8px;
      }
      .header {
        text-align: center;
        border-bottom: 1px dashed #ccc;
        padding-bottom: 10px;
        margin-bottom: 15px;
      }
      .logo {
        font-size: 22px;
        font-weight: bold;
        color: #ff4701;
      }
      .app-name {
        font-size: 14px;
        color: #ff4701;
      }
      .row {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        margin: 4px 0;
      }
      .total {
        border-top: 1px dashed #ccc;
        margin-top: 12px;
        padding-top: 10px;
        font-size: 16px;
        font-weight: bold;
      }
      button {
        width: 100%;
        margin-top: 15px;
        padding: 8px;
        border: none;
        background: #ff4701;
        color: white;
        font-size: 14px;
        border-radius: 5px;
        cursor: pointer;
      }
      @media print {
        button { display: none; }
        body { background: white; }
      }
    </style>
  </head>

  <body>
    <div class="receipt">
      <div class="header">
        <div class="logo"><span><img src="http://localhost:4200/assets/images/logo.png"
     style="width:24px; height:auto; vertical-align:middle; margin-right:6px;">
      </span>Parko</div>
        <div class="app-name">Parko exit receipt</div>
      </div>

      <div class="row"><span>Vehicle</span><span>${p.vehicleNumber}</span></div>
      <div class="row"><span>Slot</span><span>${p.slotId}</span></div>
      <div class="row"><span>Entry</span><span>${new Date(p.entryTime!).toLocaleString()}</span></div>
      <div class="row"><span>Exit</span><span>${new Date(p.exitTime!).toLocaleString()}</span></div>
      <div class="row"><span>Duration</span><span>${this.minutes} min</span></div>
      <p style="opacity:0.5; font-size:10px;text-align: center;">Note: A standard fee of ₹30 is applied to all vehicles parked under 3 hours. However vehicles with over 3 hours parking time has a total fee calculated as standard fee(₹30)+ ₹0.1 per minute. Date is shown in MM/DD/YYYY</p>
      <div class="row total">
        <span>Total</span>
        <span>₹ ${p.parkingFee}</span>
      </div>

      <button onclick="window.print()">🖨 Print Receipt</button>
    </div>
  </body>
  </html>
  `;

  const win = window.open('', '_blank', 'width=420,height=600');
  win?.document.write(html);
  win?.document.close();
}
}