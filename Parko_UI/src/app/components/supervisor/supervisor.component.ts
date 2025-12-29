import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { interval, Subscription, lastValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import { Colors } from 'chart.js';

@Component({
  selector: 'app-supervisor',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './supervisor.component.html',
  styleUrls: ['./supervisor.component.scss']
})

export class SupervisorComponent implements AfterViewInit, OnDestroy {
  
  @ViewChild('vehicleChart') vehicleChartRef!: ElementRef<HTMLCanvasElement>;
  private vehicleChart: any;

  // ================= AUTH =================
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'text' as const
    };
  }

  // ================= API =================
  private baseUrl  = 'https://localhost:7089/api/ParkedVehicles';
  private slotsUrl = 'https://localhost:7089/api/ParkedVehicles/available-slots';
  backendBaseUrl   = 'https://localhost:7089';

  // ================= STATE =================
  period: 'date' | 'week' | 'month' | 'year' = 'month';
  refDateStr = '';
  zoneFilter = '';
  zones: string[] = ['A','B','C','D'];

  totalIncome = 0;
  txCount = 0;
  lastUpdate: Date | null = null;

  displayedRows: any[] = [];
  tableColumns: string[] = [];

  searchTerm = '';
  searchField: 'all'|'vehicleNumber'|'ownerName'|'slotId' = 'all';

  slotSummary: Array<{ zone:string; capacity:number; occupied:number; free:number }> = [];

  // ================= CHART =================
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chart: any;
  private pollSub?: Subscription;

  private TOTAL_SLOTS_PER_ZONE = 15;

  constructor(private http: HttpClient) {}

  // ================= LIFECYCLE =================
  async ngAfterViewInit() {
    const today = new Date();
    this.refDateStr =
      `${today.getFullYear()}-${this.pad(today.getMonth()+1)}-${this.pad(today.getDate())}`;

    await this.initChart();        // income chart (existing)
    await this.initVehicleChart(); // 🚗 new chart
    await this.updateAll();

    this.pollSub = interval(10000).subscribe(() => this.updateAll());
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
    try { this.chart?.destroy(); } catch {}
  }

  // ================= UI =================
  apply() { this.updateAll(); }
  refresh() { window.location.reload(); }
  logout() {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  }

  // ================= MAIN FLOW =================
async updateAll() {
  try {
    const allRows = await this.fetchAllRecords();

    // ---- Zone filter ----
    let rows = this.zoneFilter
      ? allRows.filter(r =>
          String(r.slotId ?? r.SlotId ?? '')
            .toUpperCase()
            .startsWith(this.zoneFilter.toUpperCase())
        )
      : allRows;

    // ---- Period filter (TABLE + CHARTS) ----
    if (this.period === 'date') {
      const selected = new Date(this.refDateStr);

      rows = rows.filter(r => {
        const t = new Date(r.entryTime ?? r.EntryTime);
        return this.isSameDate(t, selected);
      });
    }

    // ✅ NOW table uses filtered rows
    this.displayedRows = rows;
    this.tableColumns = this.computeTableColumns(rows);

    // ---- Normalize for charts ----
    let normalized = rows
      .map(r => this.normalizeRow(r))
      .filter(r => !isNaN(r.timestamp.getTime()));

    this.totalIncome = normalized.reduce((s, r) => s + r.fee, 0);
    this.txCount = normalized.length;

    this.updateChartFromRows(normalized);
    this.updateVehicleChart(normalized);

    this.lastUpdate = new Date();

  } catch (err) {
    console.error('Supervisor update failed', err);
  }
}


  // ================= FETCH =================
  private async fetchAllRecords(): Promise<any[]> {
  try {
    const text = await lastValueFrom(
      this.http.get(this.baseUrl, this.getAuthHeaders())
    );
    const json = JSON.parse(text);
    const rows = Array.isArray(json) ? json : json?.data ?? [];

    // 🔥 SORT BY ENTRY TIME (OLD → NEW)
    rows.sort(
      (a: any, b: any) =>
        new Date(a.entryTime).getTime() -
        new Date(b.entryTime).getTime()
    );

    return rows;
  } catch {
    return [];
  }
}


  private async fetchFreeSlots(): Promise<string[]> {
    try {
      const text = await lastValueFrom(
        this.http.get(this.slotsUrl, this.getAuthHeaders())
      );
      const json = JSON.parse(text);
      return json?.availableSlots ?? json ?? [];
    } catch {
      return [];
    }
  }
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  humanize(col: string): string {
  return (
    this.tableColumnLabels[col] ??
    col
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, c => c.toUpperCase())
  );
}

  // ================= NORMALIZE =================
  private normalizeRow(r:any) {
    const t = r.exitTime || r.entryTime || r.ExitTime || r.EntryTime || r.timestamp;
    return {
      timestamp: new Date(String(t).replace(' ','T')),
      fee: Number(r.parkingFee ?? r.ParkingFee ?? 0)
    };
  }

  private isSameDate(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  // ================= CHART =================
  private async initChart() {
    const Chart = (await import('chart.js/auto')).default;
    const ctx = this.chartCanvas.nativeElement.getContext('2d');

this.chart = new Chart(ctx!, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Income',
      data: [],
      borderWidth: 3,
      tension: 0.35,          // smooth curve
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,

    interaction: {
      mode: 'index',
      intersect: false
    },

    plugins: {
      tooltip: {
        callbacks: {
          title: (items) => {
            // X-axis label (hour/day/month)
            
            return items[0].label;
          },
          label: (item) => {
            const value = item.parsed.y || 0;
            return `₹ ${value.toFixed(2)}`;
          }
        }
      },
      legend: {
        display: false
      }
    },

    scales: {
      x:{
        ticks:{
          color:'#ffffffb3'
        },
        grid:{
          color:'#ffffff40'
        }
      },
      y: {
        ticks: {
          color: '#ffffffb3',
          callback: (v) => `₹${v}`
        },
        grid:{
          color:'#ffffff40'
        }
      }
    }
  }
});
  }
  
exportToExcel() {
  console.log('Export clicked');

  if (!this.displayedRows || this.displayedRows.length === 0) {
    alert('No records to export');
    return;
  }

  // Convert objects directly to worksheet
  const worksheet = XLSX.utils.json_to_sheet(this.displayedRows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Live Records');

  XLSX.writeFile(workbook, 'Live_Records.xlsx');
}
 //++++++++++++++ vehcile count chart ++++++++++
 private async initVehicleChart() {
  const Chart = (await import('chart.js/auto')).default;
  const ctx = this.vehicleChartRef.nativeElement.getContext('2d');

  this.vehicleChart = new Chart(ctx!, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Vehicles Parked',
        data: [],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x:{
          ticks:{
            color:'#ffffffb3'
          },
          grid:{
          color:'#ffffff40'
        }
        },
        y: {
          beginAtZero: true,
          ticks: {color:'#ffffffb3', precision: 0 },
          grid:{
          color:'#ffffff40'
        },
          title: {
            display: true,
            text: 'Vehicles'
          }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}
private updateVehicleChart(rows: any[]) {
  if (!this.vehicleChart) return;

  const map = new Map<string, number>();
  let labels: string[] = [];

  // ---------------- LABELS ----------------
  switch (this.period) {
    case 'date':
      labels = Array.from({ length: 24 }, (_, i) =>
        `${i.toString().padStart(2,'0')}:00`
      );
      break;

    case 'week':
      labels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      break;

    case 'month': {
      const d = new Date(this.refDateStr);
      const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      labels = Array.from({ length: days }, (_, i) => String(i + 1));
      break;
    }

    case 'year':
      labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      break;
  }

  // init buckets
  labels.forEach(l => map.set(l, 0));

  // ---------------- COUNT VEHICLES ----------------
  for (const r of rows) {
    const d = r.timestamp;
    let key = '';

    switch (this.period) {
      case 'date':
        key = `${d.getHours().toString().padStart(2,'0')}:00`;
        break;
      case 'week':
        key = d.toLocaleDateString(undefined, { weekday:'short' });
        break;
      case 'month':
        key = String(d.getDate());
        break;
      case 'year':
        key = d.toLocaleString(undefined, { month:'short' });
        break;
    }

    if (map.has(key)) {
      map.set(key, map.get(key)! + 1); // ✅ count vehicle
    }
  }

  const values = labels.map(l => map.get(l) || 0);

  // ---------------- 🔥 PEAK HIGHLIGHT ----------------
  const max = Math.max(...values);

  const bgColors = values.map(v =>
    v === max && v > 0
      ? 'rgba(255, 71, 1, 0.95)'     // 🔥 peak bar
      : 'rgba(255, 255, 255, 0.35)' // normal bars
  );

  const borderColors = values.map(v =>
    v === max && v > 0
      ? 'rgba(255, 120, 80, 1)'
      : 'rgba(255,255,255,0.5)'
  );

  // ---------------- APPLY ----------------
  this.vehicleChart.data.labels = labels;
  this.vehicleChart.data.datasets[0].data = values;
  this.vehicleChart.data.datasets[0].backgroundColor = bgColors;
  this.vehicleChart.data.datasets[0].borderColor = borderColors;
  this.vehicleChart.data.datasets[0].borderWidth = 2;

  this.vehicleChart.update();
}


 ///////////////////////////////////////////////


  private updateChartFromRows(rows: any[]) {
    if (!this.chart) return;

    const map = new Map<string, number>();
    let labels: string[] = [];

    // ---- Labels ----
    switch (this.period) {
      case 'date':
        labels = Array.from({ length: 24 }, (_, i) =>
          `${i.toString().padStart(2,'0')}:00`
        );
        break;
      case 'week':
        labels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        break;
      case 'month': {
        const d = new Date(this.refDateStr);
        const days = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
        labels = Array.from({ length: days }, (_, i) => String(i+1));
        break;
      }
      case 'year':
        labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        break;
    }

    labels.forEach(l => map.set(l, 0));

    // ---- Bucket data ----
    for (const r of rows) {
      const d = r.timestamp;
      let key = '';

      switch (this.period) {
        case 'date':
          key = `${d.getHours().toString().padStart(2,'0')}:00`;
          break;
        case 'week':
          key = d.toLocaleDateString(undefined, { weekday:'short' });
          break;
        case 'month':
          key = String(d.getDate());
          break;
        case 'year':
          key = d.toLocaleString(undefined, { month:'short' });
          break;
      }

      if (map.has(key)) map.set(key, map.get(key)! + r.fee);
    }

    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = labels.map(l => map.get(l) || 0);
    this.chart.update();
  }

  // ================= SLOTS =================
  private computeSlotSummary(freeSlots:string[]) {
    return this.zones.map(z => {
      const free = freeSlots.filter(s=>s.startsWith(z)).length;
      return {
        zone: z,
        capacity: this.TOTAL_SLOTS_PER_ZONE,
        free,
        occupied: this.TOTAL_SLOTS_PER_ZONE - free
      };
    });
  }

  // ================= TABLE =================
  get filteredRows() {
  if (!this.searchTerm) return this.displayedRows;

  const q = this.searchTerm.toLowerCase();

  return this.displayedRows.filter(r => {
    if (this.searchField === 'all') {
      return Object.values(r).some(v =>
        String(v).toLowerCase().includes(q)
      );
    }

    return String(r[this.searchField] ?? '')
      .toLowerCase()
      .includes(q);
  });
}

  tableColumnLabels: Record<string,string> = {
    vehicleId: 'Id',
    vehicleNumber: 'Vehicle No',
    ownerName: 'Owner Name',
    vehicleImagePath: 'Image',
    slotId: 'Slot',
    entryTime: 'Entry Time',
    exitTime: 'Exit Time',
    totalTimeInMinutes: 'Total Time (min)',
    parkingFee: 'Parking Fee (₹)',
  };

  private computeTableColumns(rows: any[]) {
  if (!rows.length) return [];

  return Object.keys(rows[0]).filter(
    col => col !== 'vehicleId'
  );
}


  formatCell(val:any, col?:string) {
    if (val == null) return '';
    const c = col?.toLowerCase() ?? '';
    if (c.includes('entry') || c.includes('exit')) return new Date(val).toLocaleString();
    if (c.includes('fee')) return Number(val).toFixed(2);
    return val;
  }

  private pad(n:number){ return n<10?'0'+n:n; }

  // ================= IMAGE PREVIEW =================
  previewImageUrl: string | null = null;

  openImage(path: string) {
    if (!path) return;
    this.previewImageUrl = path.startsWith('http')
      ? path
      : this.backendBaseUrl + path;
  }

  closeImage() {
    this.previewImageUrl = null;
  }
}
