/**
 * =======================================================================
 * SISTEM MANAJEMEN INVENTARIS IT - PT AGRINAS PALMA NUSANTARA
 * Cloud Engine: Firebase Authentication & Cloud Firestore (Real-Time)
 * =======================================================================
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// =======================================================================
// 1. TEMPELKAN KONFIGURASI FIREBASE ANDA DI SINI
// =======================================================================

const firebaseConfig = {
  apiKey: "AIzaSyBd8QL2J0dAw52EUEiFtD8Y_KGswBSFtdU",
  authDomain: "inventory-it-ba0c7.firebaseapp.com",
  projectId: "inventory-it-ba0c7",
  storageBucket: "inventory-it-ba0c7.firebasestorage.app",
  messagingSenderId: "963542257434",
  appId: "1:963542257434:web:e6aeb6289193b8745ee6a3",
  measurementId: "G-PXWQL31TN8"
};

// Inisialisasi Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// =======================================================================
// 2. DATA AWAL (SEED DUMMY JIKA FIRESTORE MASIH KOSONG)
// =======================================================================
const DEFAULT_KARYAWAN = [
  { nik: 'AG-2021-001', nama: 'Ahmad Fauzi', divisi: 'IT & Sistem Informasi', jabatan: 'Manager IT' },
  { nik: 'AG-2022-015', nama: 'Siti Rahmawati', divisi: 'Finance & Accounting', jabatan: 'Staff Administrasi Keuangan' },
  { nik: 'AG-2021-008', nama: 'Budi Santoso', divisi: 'IT & Sistem Informasi', jabatan: 'Network Engineer' },
  { nik: 'AG-2023-042', nama: 'Dewi Lestari', divisi: 'Human Resources (HRD)', jabatan: 'HR Specialist' },
  { nik: 'AG-2022-029', nama: 'Rizky Pratama', divisi: 'Operasional Perkebunan', jabatan: 'Supervisor Operasional' }
];

const DEFAULT_HARDWARE = [
  { kode: 'IT-PC-001', jenis: 'PC Desktop', merek: 'Dell OptiPlex 7090 Tower', sn: 'DLLX7090-A1B2C3', mac: 'AA:BB:CC:11:22:33', pemegang: 'Ahmad Fauzi', status: 'Aktif', tahun: 2023 },
  { kode: 'IT-LT-002', jenis: 'Laptop', merek: 'Lenovo ThinkPad T14 Gen 3', sn: 'LNV-TP14-D4E5F6', mac: 'DD:EE:FF:44:55:66', pemegang: 'Siti Rahmawati', status: 'Aktif', tahun: 2024 },
  { kode: 'IT-PR-003', jenis: 'Printer', merek: 'Epson EcoTank L3210', sn: 'X89K045192', mac: '-', pemegang: 'Shared - Ruang Admin', status: 'Perlu Servis', tahun: 2023 },
  { kode: 'IT-MN-004', jenis: 'Monitor', merek: 'Samsung 24" S24R350 IPS', sn: 'SMG-S24R-J0K1L2', mac: '-', pemegang: 'Budi Santoso', status: 'Aktif', tahun: 2023 },
  { kode: 'IT-PC-005', jenis: 'PC Desktop', merek: 'HP ProDesk 400 G7', sn: 'HP-PD400-M3N4O5', mac: '77:88:99:DD:EE:FF', pemegang: 'Dewi Lestari', status: 'Rusak', tahun: 2020 }
];

const DEFAULT_NETWORK = [
  { kode: 'IT-SW-001', nama: 'Cisco Catalyst 2960-X 24P', kategori: 'Switch', ip: '192.168.1.1', mac: 'A1:B2:C3:D4:E5:F6', lokasi: 'Rack A - Ruang Server Utama', status: 'Online' },
  { kode: 'IT-RT-002', nama: 'MikroTik Cloud Core RB4011', kategori: 'Router', ip: '192.168.1.254', mac: 'F1:E2:D3:C4:B5:A6', lokasi: 'Rack A - Ruang Server Utama', status: 'Online' },
  { kode: 'IT-AP-003', nama: 'Ubiquiti UniFi 6 Long-Range', kategori: 'Access Point', ip: '192.168.1.10', mac: '12:34:56:78:9A:BC', lokasi: 'Koridor Manajemen Lantai 2', status: 'Online' },
  { kode: 'IT-SV-004', nama: 'Dell PowerEdge R740 2U Rack', kategori: 'Server', ip: '192.168.1.250', mac: 'DE:AD:BE:EF:00:01', lokasi: 'Rack B - Ruang Server Utama', status: 'Online' },
  { kode: 'IT-FW-005', nama: 'Fortinet FortiGate 60F', kategori: 'Firewall', ip: '192.168.1.253', mac: '90:09:D0:11:22:33', lokasi: 'Rack A - Gateway Boundary', status: 'Maintenance' }
];

// =======================================================================
// 3. STATE & REAL-TIME LISTENERS FIRESTORE
// =======================================================================
const State = {
  user: null,
  karyawan: [],
  hardware: [],
  network: [],
  kendaraan: [],
  kehadiran: [],
  unsubscribers: []
};

const App = {
  currentView: 'dashboard',
  hardwareFilter: 'all',
  networkFilter: 'all',
  hardwareStatusFilter: 'all',
  networkStatusFilter: 'all',
  attendanceDateFilter: '',
  globalKeyword: '',
  dateRefreshTimer: null,

  init() {
    this.updateHeaderDate();
    if (!this.dateRefreshTimer) {
      this.dateRefreshTimer = setInterval(() => this.updateHeaderDate(), 60000);
    }
    this.bindEvents();
    this.listenAuthState();
  },

  // --- AUTENTIKASI FIREBASE ---
  listenAuthState() {
    const loginOverlay = document.getElementById('login-overlay');
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        State.user = user;
        loginOverlay.style.display = 'none';
        this.updateProfileUI(user);
        await this.seedIfEmpty();
        this.startRealtimeListeners();
      } else {
        State.user = null;
        this.stopRealtimeListeners();
        loginOverlay.style.display = 'flex';
      }
    });
  },

  async login(email, password) {
    const alertBox = document.getElementById('login-alert');
    const btnSubmit = document.getElementById('btn-login-submit');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Memverifikasi...';

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      alertBox.style.display = 'none';
    } catch (error) {
      console.error('Login error:', error.code);
      alertBox.style.display = 'block';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        alertBox.textContent = 'Email atau Password salah! Pastikan akun sudah dibuat di Firebase Authentication.';
      } else if (error.code === 'auth/too-many-requests') {
        alertBox.textContent = 'Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat.';
      } else {
        alertBox.textContent = 'Gagal masuk: ' + error.message;
      }
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Masuk ke Sistem';
    }
  },

  async logout() {
    if (confirm('Apakah Anda yakin ingin keluar dari sistem inventaris?')) {
      await signOut(auth);
      document.getElementById('user-dropdown').classList.remove('show');
      document.getElementById('form-login').reset();
    }
  },

  updateProfileUI(user) {
    const displayName = user.displayName || 'Admin IT';
    const email = user.email || 'admin@agrinas.co.id';
    const initial = displayName.charAt(0).toUpperCase();

    document.getElementById('header-user-avatar').textContent = initial;
    document.getElementById('info-modal-avatar').textContent = initial;
    document.getElementById('header-user-name').textContent = displayName;
    document.getElementById('header-user-role').textContent = 'IT Department';

    document.getElementById('dropdown-user-name').textContent = displayName;
    document.getElementById('dropdown-user-role').textContent = email;

    document.getElementById('info-account-name').textContent = displayName;
    document.getElementById('info-account-role').textContent = 'IT Department';
    document.getElementById('info-account-email').textContent = email;

    document.getElementById('settings-name').value = displayName;
    document.getElementById('settings-email').value = email;
    document.getElementById('settings-password').value = '';
  },

  // --- SEED DATA AWAL JIKA KOLEKSI MASIH KOSONG ---
  async seedIfEmpty() {
    try {
      const kSnap = await getDocs(collection(db, 'karyawan'));
      if (kSnap.empty) {
        for (const item of DEFAULT_KARYAWAN) {
          await addDoc(collection(db, 'karyawan'), item);
        }
      }
      const hSnap = await getDocs(collection(db, 'hardware'));
      if (hSnap.empty) {
        for (const item of DEFAULT_HARDWARE) {
          await addDoc(collection(db, 'hardware'), item);
        }
      }
      const nSnap = await getDocs(collection(db, 'network'));
      if (nSnap.empty) {
        for (const item of DEFAULT_NETWORK) {
          await addDoc(collection(db, 'network'), item);
        }
      }
    } catch (err) {
      console.error('Gagal melakukan seed awal Firestore:', err);
    }
  },

  // --- REAL-TIME FIRESTORE LISTENERS ---
  startRealtimeListeners() {
    this.stopRealtimeListeners();

    const unsubKaryawan = onSnapshot(collection(db, 'karyawan'), (snapshot) => {
      State.karyawan = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      this.renderAll();
    });

    const unsubHardware = onSnapshot(collection(db, 'hardware'), (snapshot) => {
      State.hardware = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      this.renderAll();
    });

    const unsubNetwork = onSnapshot(collection(db, 'network'), (snapshot) => {
      State.network = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      this.renderAll();
    });

    const unsubKendaraan = onSnapshot(collection(db, 'kendaraan'), (snapshot) => {
      State.kendaraan = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      this.renderAll();
    }, (error) => {
      console.error('Gagal menyinkronkan data kendaraan:', error);
    });

    const unsubKehadiran = onSnapshot(collection(db, 'kehadiran'), (snapshot) => {
      State.kehadiran = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      this.renderAll();
    }, (error) => {
      console.error('Gagal menyinkronkan data kehadiran:', error);
    });

    State.unsubscribers = [unsubKaryawan, unsubHardware, unsubNetwork, unsubKendaraan, unsubKehadiran];
  },

  stopRealtimeListeners() {
    State.unsubscribers.forEach(unsub => unsub());
    State.unsubscribers = [];
  },

  // --- SPA NAVIGATION ---
  navigateTo(viewId) {
    this.currentView = viewId;

    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.view === viewId);
    });

    document.querySelectorAll('.view-section').forEach(view => {
      view.classList.remove('active');
    });
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) targetView.classList.add('active');

    const titles = {
      dashboard: { main: 'Dashboard Utama Aset', sub: 'RINGKASAN SISTEM & STATISTIK' },
      karyawan: { main: 'Data Karyawan', sub: 'DAFTAR PEGAWAI & PEMEGANG ASET' },
      hardware: { main: 'End-User Hardware', sub: 'INVENTARIS KOMPUTER, LAPTOP & PRINTER' },
      network: { main: 'Network & Server', sub: 'INFRASTRUKTUR JARINGAN & SERVER' },
      kendaraan: { main: 'Kendaraan Operasional', sub: 'INVENTARIS DAN STATUS KENDARAAN' },
      kehadiran: { main: 'Data Kehadiran', sub: 'CATATAN KEHADIRAN KARYAWAN' },
      audit: { main: 'Laporan Audit', sub: 'REKAPITULASI FISIK & CETAK BERITA ACARA' },
      pengaturan: { main: 'Pengaturan Sistem', sub: 'PROFIL & MANAJEMEN CLOUD FIRESTORE' }
    };

    const titleInfo = titles[viewId] || { main: 'Inventaris', sub: 'PT AGRINAS PALMA NUSANTARA' };
    document.getElementById('page-breadcrumb-main').textContent = titleInfo.main;
    document.getElementById('page-breadcrumb-sub').textContent = titleInfo.sub;

    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.renderCurrentView();
  },

  renderCurrentView() {
    switch (this.currentView) {
      case 'dashboard': this.renderDashboard(); break;
      case 'karyawan': this.renderKaryawanTable(); break;
      case 'hardware': this.renderHardwareTable(); break;
      case 'network': this.renderNetworkTable(); break;
      case 'kendaraan': this.renderKendaraanTable(); break;
      case 'kehadiran': this.renderKehadiranTable(); break;
      case 'audit': this.renderAuditReport(); break;
    }
  },

  renderAll() {
    this.renderDashboard();
    this.renderKaryawanTable();
    this.renderHardwareTable();
    this.renderNetworkTable();
    this.renderKendaraanTable();
    this.renderKehadiranTable();
    this.renderAuditReport();
  },

  // --- DASHBOARD RENDERER ---
  renderDashboard() {
    const { karyawan, hardware, network, kendaraan, kehadiran } = State;

    let servisCount = 0;
    hardware.forEach(h => {
      if (h.status === 'Perlu Servis' || h.status === 'Rusak') servisCount++;
    });
    network.forEach(n => {
      if (n.status === 'Maintenance' || n.status === 'Offline') servisCount++;
    });

    document.getElementById('stat-karyawan').textContent = karyawan.length;
    document.getElementById('stat-hardware').textContent = hardware.length;
    document.getElementById('stat-network').textContent = network.length;
    document.getElementById('stat-servis').textContent = servisCount;
    const today = this.getTodayDate();
    const todayAttendance = kehadiran.filter(item => item.tanggal === today);
    const presentCount = todayAttendance.filter(item => item.status === 'Hadir').length;
    const absentCount = todayAttendance.filter(item => item.status === 'Tidak Masuk / Alpa').length;
    document.getElementById('stat-kendaraan').textContent = kendaraan.length;
    document.getElementById('stat-kehadiran').textContent = `${presentCount} / ${absentCount}`;

    const recentTbody = document.getElementById('dashboard-recent-hardware');
    const keyword = (this.globalKeyword || '').toLowerCase().trim();

    let recentItems = [...hardware].reverse();
    if (keyword) {
      recentItems = recentItems.filter(item =>
        (item.kode || '').toLowerCase().includes(keyword) ||
        (item.jenis || '').toLowerCase().includes(keyword) ||
        (item.merek || '').toLowerCase().includes(keyword) ||
        (item.pemegang || '').toLowerCase().includes(keyword) ||
        (item.sn || '').toLowerCase().includes(keyword)
      );
    } else {
      recentItems = recentItems.slice(0, 4);
    }

    if (recentItems.length === 0) {
      recentTbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 20px; color: var(--text-muted);">Belum ada data perangkat atau tidak ditemukan.</td></tr>';
    } else {
      recentTbody.innerHTML = recentItems.map(item => `
        <tr>
          <td><span class="asset-tag">${this.escape(item.kode)}</span></td>
          <td><strong>${this.escape(item.jenis)}</strong></td>
          <td>${this.escape(item.merek)}</td>
          <td>${this.escape(item.pemegang)}</td>
          <td>${this.getStatusBadge(item.status)}</td>
        </tr>
      `).join('');
    }

    const activityList = document.getElementById('dashboard-activity-list');
    const hardwareCriticals = hardware.filter(h => h.status === 'Perlu Servis' || h.status === 'Rusak');
    const networkCriticals = network.filter(n => n.status === 'Maintenance' || n.status === 'Offline');
    const criticalCount = hardwareCriticals.length + networkCriticals.length;

    let activitiesHtml = '';
    if (criticalCount > 0) {
      activitiesHtml += `
        <div class="activity-item" style="border-left-color: var(--warning);">
          <div>
            <div class="item-title">⚠️ ${criticalCount} Perangkat Membutuhkan Tindakan</div>
            <div class="item-time">${hardwareCriticals.length} hardware dan ${networkCriticals.length} network perlu diperiksa</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="app.showCriticalAssets()">Cek</button>
        </div>
      `;
    }

    activitiesHtml += `
      <div class="activity-item">
        <div>
          <div class="item-title">☁️ Cloud Firestore Terhubung</div>
          <div class="item-time">Data tersinkronisasi real-time ke server Firebase.</div>
        </div>
        <span class="badge badge-success">ONLINE</span>
      </div>
      <div class="activity-item">
        <div>
          <div class="item-title">🏢 PT Agrinas Palma Nusantara</div>
          <div class="item-time">Audit Tagging Aset IT Siap Dicetak.</div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="app.navigateTo('audit')">Laporan</button>
      </div>
    `;
    activityList.innerHTML = activitiesHtml;
  },

  // --- CRUD: KARYAWAN ---
  renderKaryawanTable() {
    const tbody = document.getElementById('table-karyawan-body');
    const keyword = this.globalKeyword.toLowerCase().trim();

    const filtered = State.karyawan.filter(k =>
      (k.nama || '').toLowerCase().includes(keyword) ||
      (k.nik || '').toLowerCase().includes(keyword) ||
      (k.divisi || '').toLowerCase().includes(keyword) ||
      (k.jabatan || '').toLowerCase().includes(keyword) ||
      (k.tanggal_mulai || '').toLowerCase().includes(keyword) ||
      (k.akhir_jabatan || '').toLowerCase().includes(keyword) ||
      (k.status_jabatan || '').toLowerCase().includes(keyword)
    );

    document.getElementById('showing-karyawan').textContent = `Menampilkan ${filtered.length} dari ${State.karyawan.length} karyawan`;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 24px; color: var(--text-muted);">Tidak ada data karyawan yang cocok.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((k, index) => {
      const deviceCount = State.hardware.filter(h => (h.pemegang || '').toLowerCase() === (k.nama || '').toLowerCase()).length;
      return `
        <tr>
          <td class="row-num">${index + 1}</td>
          <td><span class="asset-tag">${this.escape(k.nik)}</span></td>
          <td><strong>${this.escape(k.nama)}</strong></td>
          <td>${this.escape(k.divisi)}</td>
          <td>${this.escape(k.jabatan)}</td>
          <td>
            <div class="tenure-cell">
              <span>${this.formatDate(k.tanggal_mulai) || '-'}</span>
              <small>${this.getTenureSummary(k)}</small>
              ${this.getEmploymentBadge(k.status_jabatan)}
            </div>
          </td>
          <td><span class="badge ${deviceCount > 0 ? 'badge-info' : 'badge-gender'}">${deviceCount} Perangkat</span></td>
          <td style="text-align: center;">
            <div class="action-buttons" style="justify-content: center;">
              <button class="btn-icon edit" title="Edit Karyawan" onclick="app.editKaryawan('${k.id}')">✏️</button>
              <button class="btn-icon delete" title="Hapus Karyawan" onclick="app.deleteKaryawan('${k.id}', '${this.escape(k.nama)}')">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openKaryawanModal(karyawan = null) {
    const title = document.getElementById('modal-karyawan-title');
    const form = document.getElementById('form-karyawan');
    form.reset();

    if (karyawan) {
      title.innerHTML = '<span>✏️</span> Edit Data Karyawan';
      document.getElementById('karyawan-id').value = karyawan.id;
      document.getElementById('karyawan-nik').value = karyawan.nik;
      document.getElementById('karyawan-nama').value = karyawan.nama;
      document.getElementById('karyawan-divisi').value = karyawan.divisi;
      document.getElementById('karyawan-jabatan').value = karyawan.jabatan;
      document.getElementById('karyawan-tanggal-mulai').value = karyawan.tanggal_mulai || '';
      document.getElementById('karyawan-akhir-jabatan').value = karyawan.akhir_jabatan || '';
      document.getElementById('karyawan-status-jabatan').value = karyawan.status_jabatan || 'Karyawan Tetap';
    } else {
      title.innerHTML = '<span>👥</span> Tambah Data Karyawan';
      document.getElementById('karyawan-id').value = '';
      document.getElementById('karyawan-status-jabatan').value = 'Karyawan Tetap';
    }
    this.openModal('modal-karyawan');
  },

  async saveKaryawan(e) {
    e.preventDefault();
    const id = document.getElementById('karyawan-id').value;
    const payload = {
      nik: document.getElementById('karyawan-nik').value.trim(),
      nama: document.getElementById('karyawan-nama').value.trim(),
      divisi: document.getElementById('karyawan-divisi').value,
      jabatan: document.getElementById('karyawan-jabatan').value.trim(),
      tanggal_mulai: document.getElementById('karyawan-tanggal-mulai').value,
      akhir_jabatan: document.getElementById('karyawan-akhir-jabatan').value,
      status_jabatan: document.getElementById('karyawan-status-jabatan').value
    };

    try {
      if (id) {
        const oldItem = State.karyawan.find(k => k.id === id);
        await updateDoc(doc(db, 'karyawan', id), payload);

        if (oldItem && oldItem.nama !== payload.nama) {
          const affectedHw = State.hardware.filter(h => (h.pemegang || '').toLowerCase() === oldItem.nama.toLowerCase());
          for (const hw of affectedHw) {
            await updateDoc(doc(db, 'hardware', hw.id), { pemegang: payload.nama });
          }
          const affectedVehicles = State.kendaraan.filter(vehicle =>
            (vehicle.pemegang || '').toLowerCase() === oldItem.nama.toLowerCase()
          );
          for (const vehicle of affectedVehicles) {
            await updateDoc(doc(db, 'kendaraan', vehicle.id), { pemegang: payload.nama });
          }
        }
      } else {
        await addDoc(collection(db, 'karyawan'), payload);
      }
      this.closeModal('modal-karyawan');
    } catch (err) {
      alert('Gagal menyimpan data karyawan: ' + err.message);
    }
  },

  editKaryawan(id) {
    const item = State.karyawan.find(k => k.id === id);
    if (item) this.openKaryawanModal(item);
  },

  async deleteKaryawan(id, nama) {
    if (confirm(`Yakin ingin menghapus data karyawan "${nama}" dari Cloud Firestore?`)) {
      try {
        await deleteDoc(doc(db, 'karyawan', id));
      } catch (err) {
        alert('Gagal menghapus karyawan: ' + err.message);
      }
    }
  },

  // --- CRUD: END-USER HARDWARE ---
  populatePemegangDropdown(selectedPemegang = '') {
    const select = document.getElementById('hardware-pemegang');
    const sharedOptions = [
      'Shared - Ruang Admin',
      'Shared - Divisi Keuangan',
      'Shared - Ruang IT',
      'Shared - Lantai 1'
    ];

    let options = '<option value="">Pilih Karyawan / Pemegang...</option>';
    options += '<optgroup label="Karyawan Terdaftar">';
    options += State.karyawan.map(k => {
      const isSelected = k.nama === selectedPemegang ? 'selected' : '';
      return `<option value="${this.escape(k.nama)}" ${isSelected}>${this.escape(k.nama)} (${this.escape(k.divisi)})</option>`;
    }).join('');
    options += '</optgroup>';

    options += '<optgroup label="Shared / Lokasi Divisi">';
    options += sharedOptions.map(loc => {
      const isSelected = loc === selectedPemegang ? 'selected' : '';
      return `<option value="${loc}" ${isSelected}>${loc}</option>`;
    }).join('');
    options += '</optgroup>';

    select.innerHTML = options;
  },

  updateMacPlaceholder(jenis) {
    const macInput = document.getElementById('hardware-mac');
    if (jenis === 'Printer') {
      macInput.placeholder = 'Opsional (Kosongkan jika printer USB)';
    } else {
      macInput.placeholder = 'Contoh: AA:BB:CC:11:22:33';
    }
  },

  matchesAssetStatus(status, filter) {
    if (filter === 'all') return true;
    const normalizedStatus = (status || '').toLowerCase();
    const isActive = normalizedStatus === 'aktif' || normalizedStatus === 'online';
    const isService = normalizedStatus === 'perlu servis' || normalizedStatus === 'maintenance';
    const isBroken = normalizedStatus === 'rusak' || normalizedStatus === 'offline';
    if (filter === 'Aktif') return isActive;
    if (filter === 'Perlu Servis') return isService;
    if (filter === 'Rusak') return isBroken;
    if (filter === 'critical') return isService || isBroken;
    return true;
  },

  renderHardwareTable() {
    const tbody = document.getElementById('table-hardware-body');
    const keyword = this.globalKeyword.toLowerCase().trim();

    const filtered = State.hardware.filter(item => {
      const matchFilter = this.hardwareFilter === 'all' || (item.jenis || '').toLowerCase() === this.hardwareFilter.toLowerCase();
      const matchStatus = this.matchesAssetStatus(item.status, this.hardwareStatusFilter);
      const matchSearch = (item.kode || '').toLowerCase().includes(keyword) ||
                          (item.merek || '').toLowerCase().includes(keyword) ||
                          (item.sn || '').toLowerCase().includes(keyword) ||
                          (item.mac || '').toLowerCase().includes(keyword) ||
                          (item.pemegang || '').toLowerCase().includes(keyword);
      return matchFilter && matchStatus && matchSearch;
    });

    document.getElementById('showing-hardware').textContent = `Menampilkan ${filtered.length} dari ${State.hardware.length} perangkat`;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 24px; color: var(--text-muted);">Tidak ada perangkat hardware yang cocok.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(item => `
      <tr>
        <td><span class="asset-tag">${this.escape(item.kode)}</span></td>
        <td><strong>${this.escape(item.jenis)}</strong></td>
        <td>${this.escape(item.merek)}</td>
        <td><span class="serial-num">${this.escape(item.sn)}</span></td>
        <td><span class="mac-address">${this.escape(item.mac || '-')}</span></td>
        <td><strong>${this.escape(item.pemegang)}</strong></td>
        <td>${this.getStatusBadge(item.status)}</td>
        <td style="text-align: center;">
          <div class="action-buttons" style="justify-content: center;">
            <button class="btn-icon edit" title="Edit Perangkat" onclick="app.editHardware('${item.id}')">✏️</button>
            <button class="btn-icon delete" title="Hapus Perangkat" onclick="app.deleteHardware('${item.id}', '${this.escape(item.kode)}')">🗑️</button>
            <button class="btn-icon qr" title="Cetak Label QR" onclick="app.openAssetQr('hardware', '${item.id}')">QR</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openHardwareModal(hardware = null) {
    const title = document.getElementById('modal-hardware-title');
    const form = document.getElementById('form-hardware');
    form.reset();

    this.populatePemegangDropdown(hardware ? hardware.pemegang : '');

    if (hardware) {
      title.innerHTML = '<span>✏️</span> Edit End-User Hardware';
      document.getElementById('hardware-id').value = hardware.id;
      document.getElementById('hardware-kode').value = hardware.kode;
      document.getElementById('hardware-jenis').value = hardware.jenis;
      document.getElementById('hardware-merek').value = hardware.merek;
      document.getElementById('hardware-sn').value = hardware.sn;
      document.getElementById('hardware-mac').value = hardware.mac === '-' ? '' : (hardware.mac || '');
      document.getElementById('hardware-pemegang').value = hardware.pemegang;
      document.getElementById('hardware-status').value = hardware.status;
      document.getElementById('hardware-tahun').value = hardware.tahun || '';
      this.updateMacPlaceholder(hardware.jenis);
    } else {
      title.innerHTML = '<span>💻</span> Tambah End-User Hardware';
      document.getElementById('hardware-id').value = '';
      this.updateMacPlaceholder('');
    }
    this.openModal('modal-hardware');
  },

  async saveHardware(e) {
    e.preventDefault();
    const id = document.getElementById('hardware-id').value;
    const rawMac = document.getElementById('hardware-mac').value.trim();
    const payload = {
      kode: document.getElementById('hardware-kode').value.trim(),
      jenis: document.getElementById('hardware-jenis').value,
      merek: document.getElementById('hardware-merek').value.trim(),
      sn: document.getElementById('hardware-sn').value.trim(),
      mac: rawMac === '' ? '-' : rawMac,
      pemegang: document.getElementById('hardware-pemegang').value,
      status: document.getElementById('hardware-status').value,
      tahun: parseInt(document.getElementById('hardware-tahun').value, 10) || new Date().getFullYear()
    };

    try {
      if (id) {
        await updateDoc(doc(db, 'hardware', id), payload);
      } else {
        await addDoc(collection(db, 'hardware'), payload);
      }
      this.closeModal('modal-hardware');
    } catch (err) {
      alert('Gagal menyimpan perangkat hardware: ' + err.message);
    }
  },

  editHardware(id) {
    const item = State.hardware.find(h => h.id === id);
    if (item) this.openHardwareModal(item);
  },

  async deleteHardware(id, kode) {
    if (confirm(`Yakin ingin menghapus perangkat hardware [${kode}] dari Cloud Firestore?`)) {
      try {
        await deleteDoc(doc(db, 'hardware', id));
      } catch (err) {
        alert('Gagal menghapus perangkat: ' + err.message);
      }
    }
  },

  // --- CRUD: NETWORK & SERVER ---
  renderNetworkTable() {
    const tbody = document.getElementById('table-network-body');
    const keyword = this.globalKeyword.toLowerCase().trim();

    const filtered = State.network.filter(item => {
      const matchFilter = this.networkFilter === 'all' || (item.kategori || '').toLowerCase() === this.networkFilter.toLowerCase();
      const matchStatus = this.matchesAssetStatus(item.status, this.networkStatusFilter);
      const matchSearch = (item.kode || '').toLowerCase().includes(keyword) ||
                          (item.nama || '').toLowerCase().includes(keyword) ||
                          (item.ip || '').toLowerCase().includes(keyword) ||
                          (item.mac || '').toLowerCase().includes(keyword) ||
                          (item.lokasi || '').toLowerCase().includes(keyword);
      return matchFilter && matchStatus && matchSearch;
    });

    document.getElementById('showing-network').textContent = `Menampilkan ${filtered.length} dari ${State.network.length} perangkat jaringan`;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 24px; color: var(--text-muted);">Tidak ada perangkat network yang cocok.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(item => `
      <tr>
        <td><span class="asset-tag">${this.escape(item.kode)}</span></td>
        <td><strong>${this.escape(item.nama)}</strong></td>
        <td><span class="badge badge-info">${this.escape(item.kategori)}</span></td>
        <td><span class="ip-address">${this.escape(item.ip || '-')}</span></td>
        <td><span class="mac-address">${this.escape(item.mac || '-')}</span></td>
        <td>${this.escape(item.lokasi)}</td>
        <td>${this.getStatusBadge(item.status)}</td>
        <td style="text-align: center;">
          <div class="action-buttons" style="justify-content: center;">
            <button class="btn-icon edit" title="Edit Perangkat" onclick="app.editNetwork('${item.id}')">✏️</button>
            <button class="btn-icon delete" title="Hapus Perangkat" onclick="app.deleteNetwork('${item.id}', '${this.escape(item.kode)}')">🗑️</button>
            <button class="btn-icon qr" title="Cetak Label QR" onclick="app.openAssetQr('network', '${item.id}')">QR</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openNetworkModal(network = null) {
    const title = document.getElementById('modal-network-title');
    const form = document.getElementById('form-network');
    form.reset();

    if (network) {
      title.innerHTML = '<span>✏️</span> Edit Network &amp; Server';
      document.getElementById('network-id').value = network.id;
      document.getElementById('network-kode').value = network.kode;
      document.getElementById('network-nama').value = network.nama;
      document.getElementById('network-kategori').value = network.kategori;
      document.getElementById('network-ip').value = network.ip === '-' ? '' : (network.ip || '');
      document.getElementById('network-mac').value = network.mac === '-' ? '' : (network.mac || '');
      document.getElementById('network-lokasi').value = network.lokasi;
      document.getElementById('network-status').value = network.status;
    } else {
      title.innerHTML = '<span>🌐</span> Tambah Network &amp; Server';
      document.getElementById('network-id').value = '';
    }
    this.openModal('modal-network');
  },

  async saveNetwork(e) {
    e.preventDefault();
    const id = document.getElementById('network-id').value;
    const rawIp = document.getElementById('network-ip').value.trim();
    const rawMac = document.getElementById('network-mac').value.trim();

    const payload = {
      kode: document.getElementById('network-kode').value.trim(),
      nama: document.getElementById('network-nama').value.trim(),
      kategori: document.getElementById('network-kategori').value,
      ip: rawIp === '' ? '-' : rawIp,
      mac: rawMac === '' ? '-' : rawMac,
      lokasi: document.getElementById('network-lokasi').value.trim(),
      status: document.getElementById('network-status').value
    };

    try {
      if (id) {
        await updateDoc(doc(db, 'network', id), payload);
      } else {
        await addDoc(collection(db, 'network'), payload);
      }
      this.closeModal('modal-network');
    } catch (err) {
      alert('Gagal menyimpan perangkat jaringan: ' + err.message);
    }
  },

  editNetwork(id) {
    const item = State.network.find(n => n.id === id);
    if (item) this.openNetworkModal(item);
  },

  async deleteNetwork(id, kode) {
    if (confirm(`Yakin ingin menghapus perangkat jaringan [${kode}] dari Cloud Firestore?`)) {
      try {
        await deleteDoc(doc(db, 'network', id));
      } catch (err) {
        alert('Gagal menghapus perangkat jaringan: ' + err.message);
      }
    }
  },

  openAssetQr(type, id) {
    const item = type === 'hardware'
      ? State.hardware.find(asset => asset.id === id)
      : State.network.find(asset => asset.id === id);
    if (!item) {
      alert('Data aset tidak ditemukan. Silakan muat ulang tabel.');
      return;
    }
    if (typeof window.QRCode !== 'function') {
      console.error('Library QR Code tidak tersedia.');
      alert('QR Code tidak dapat dibuat karena library QR belum berhasil dimuat. Periksa koneksi internet lalu coba lagi.');
      return;
    }

    const labelData = {
      kode: item.kode || '-',
      nama: type === 'hardware' ? `${item.jenis || ''} ${item.merek || ''}`.trim() : item.nama || '-',
      model: type === 'hardware' ? item.merek || '-' : item.nama || '-',
      pemegang: type === 'hardware' ? item.pemegang || '-' : item.pemegang || item.lokasi || '-'
    };
    const holderLabel = type === 'hardware' ? 'Pemegang' : 'Pemegang / Lokasi';
    const qrText = [
      `Kode Aset: ${labelData.kode}`,
      `Nama Perangkat: ${labelData.nama}`,
      `Merek/Tipe: ${labelData.model}`,
      `${holderLabel}: ${labelData.pemegang}`
    ].join('\n');

    document.getElementById('qr-asset-code').textContent = labelData.kode;
    document.getElementById('qr-asset-name').textContent = labelData.nama;
    document.getElementById('qr-asset-model').textContent = labelData.model;
    document.getElementById('qr-asset-holder-label').textContent = `${holderLabel}:`;
    document.getElementById('qr-asset-holder').textContent = labelData.pemegang;
    const qrContainer = document.getElementById('asset-qr-code');
    qrContainer.replaceChildren();
    new window.QRCode(qrContainer, {
      text: qrText,
      width: 150,
      height: 150,
      correctLevel: window.QRCode.CorrectLevel.M
    });
    this.openModal('modal-qr');
  },

  printQrLabel() {
    if (!document.getElementById('asset-qr-code').childElementCount) {
      alert('QR Code belum tersedia. Buka kembali label aset sebelum mencetak.');
      return;
    }
    const clearPrintMode = () => document.body.classList.remove('printing-qr');
    window.addEventListener('afterprint', clearPrintMode, { once: true });
    document.body.classList.add('printing-qr');
    window.print();
  },

  showCriticalAssets() {
    this.hardwareFilter = 'all';
    this.networkFilter = 'all';
    this.hardwareStatusFilter = 'critical';
    this.networkStatusFilter = 'critical';
    document.getElementById('hardware-status-filter').value = 'critical';
    document.getElementById('network-status-filter').value = 'critical';
    document.querySelectorAll('#hardware-filter-tabs .filter-tab, #network-filter-tabs .filter-tab')
      .forEach(tab => tab.classList.toggle('active', tab.dataset.filter === 'all'));
    this.navigateTo('hardware');
  },

  // --- CRUD: KENDARAAN OPERASIONAL ---
  populateKendaraanPemegangDropdown(selectedPemegang = '') {
    const select = document.getElementById('kendaraan-pemegang');
    let options = '<option value="">Pilih karyawan...</option>';
    options += State.karyawan.map(k => `
      <option value="${this.escape(k.nama)}" ${k.nama === selectedPemegang ? 'selected' : ''}>
        ${this.escape(k.nama)} (${this.escape(k.nik)})
      </option>
    `).join('');
    if (selectedPemegang && !State.karyawan.some(k => k.nama === selectedPemegang)) {
      options += `<option value="${this.escape(selectedPemegang)}" selected>${this.escape(selectedPemegang)}</option>`;
    }
    select.innerHTML = options;
  },

  renderKendaraanTable() {
    const tbody = document.getElementById('table-kendaraan-body');
    const keyword = this.globalKeyword.toLowerCase().trim();
    const filtered = State.kendaraan.filter(item =>
      [item.no_polisi, item.jenis, item.merk_tipe, item.tahun, item.pemegang, item.jatuh_tempo_stnk, item.kondisi]
        .some(value => String(value || '').toLowerCase().includes(keyword))
    );

    document.getElementById('showing-kendaraan').textContent =
      `Menampilkan ${filtered.length} dari ${State.kendaraan.length} kendaraan`;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 24px; color: var(--text-muted);">Tidak ada data kendaraan yang cocok.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(item => `
      <tr>
        <td><span class="asset-tag">${this.escape(item.no_polisi)}</span></td>
        <td>${this.escape(item.jenis)}</td>
        <td><strong>${this.escape(item.merk_tipe)}</strong></td>
        <td>${this.escape(item.tahun)}</td>
        <td>${this.escape(item.pemegang)}</td>
        <td>${this.formatDate(item.jatuh_tempo_stnk) || '-'}</td>
        <td>${this.getVehicleConditionBadge(item.kondisi)}</td>
        <td style="text-align: center;">
          <div class="action-buttons" style="justify-content: center;">
            <button class="btn-icon edit" title="Edit Kendaraan" onclick="app.editKendaraan('${item.id}')">✏️</button>
            <button class="btn-icon delete" title="Hapus Kendaraan" onclick="app.deleteKendaraan('${item.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openKendaraanModal(kendaraan = null) {
    const form = document.getElementById('form-kendaraan');
    form.reset();
    this.populateKendaraanPemegangDropdown(kendaraan ? kendaraan.pemegang : '');
    document.getElementById('modal-kendaraan-title').innerHTML = kendaraan
      ? '<span>✏️</span> Edit Kendaraan'
      : '<span>🚙</span> Tambah Kendaraan';
    document.getElementById('kendaraan-id').value = kendaraan ? kendaraan.id : '';
    document.getElementById('kendaraan-no-polisi').value = kendaraan ? kendaraan.no_polisi || '' : '';
    document.getElementById('kendaraan-jenis').value = kendaraan ? kendaraan.jenis || '' : '';
    document.getElementById('kendaraan-merk-tipe').value = kendaraan ? kendaraan.merk_tipe || '' : '';
    document.getElementById('kendaraan-tahun').value = kendaraan ? kendaraan.tahun || '' : new Date().getFullYear();
    document.getElementById('kendaraan-jatuh-tempo').value = kendaraan ? kendaraan.jatuh_tempo_stnk || '' : '';
    document.getElementById('kendaraan-kondisi').value = kendaraan ? kendaraan.kondisi || 'Baik / Siap Pakai' : 'Baik / Siap Pakai';
    this.openModal('modal-kendaraan');
  },

  async saveKendaraan(e) {
    e.preventDefault();
    const id = document.getElementById('kendaraan-id').value;
    const payload = {
      no_polisi: document.getElementById('kendaraan-no-polisi').value.trim().toUpperCase(),
      jenis: document.getElementById('kendaraan-jenis').value,
      merk_tipe: document.getElementById('kendaraan-merk-tipe').value.trim(),
      tahun: Number(document.getElementById('kendaraan-tahun').value),
      pemegang: document.getElementById('kendaraan-pemegang').value,
      jatuh_tempo_stnk: document.getElementById('kendaraan-jatuh-tempo').value,
      kondisi: document.getElementById('kendaraan-kondisi').value
    };

    try {
      if (id) await updateDoc(doc(db, 'kendaraan', id), payload);
      else await addDoc(collection(db, 'kendaraan'), payload);
      this.closeModal('modal-kendaraan');
    } catch (err) {
      alert('Gagal menyimpan data kendaraan: ' + err.message);
    }
  },

  editKendaraan(id) {
    const item = State.kendaraan.find(kendaraan => kendaraan.id === id);
    if (item) this.openKendaraanModal(item);
  },

  async deleteKendaraan(id) {
    const item = State.kendaraan.find(kendaraan => kendaraan.id === id);
    if (!item || !confirm(`Yakin ingin menghapus kendaraan [${item.no_polisi}] dari Cloud Firestore?`)) return;
    try {
      await deleteDoc(doc(db, 'kendaraan', id));
    } catch (err) {
      alert('Gagal menghapus data kendaraan: ' + err.message);
    }
  },

  // --- CRUD: DATA KEHADIRAN ---
  populateKehadiranKaryawanDropdown(selectedId = '', selectedName = '', selectedNik = '') {
    const select = document.getElementById('kehadiran-karyawan');
    let options = '<option value="">Pilih karyawan...</option>';
    options += State.karyawan.map(k => `
      <option value="${this.escape(k.id)}" data-name="${this.escape(k.nama)}" data-nik="${this.escape(k.nik)}" ${k.id === selectedId ? 'selected' : ''}>
        ${this.escape(k.nama)} (${this.escape(k.nik)})
      </option>
    `).join('');
    if (selectedId && !State.karyawan.some(k => k.id === selectedId)) {
      options += `<option value="${this.escape(selectedId)}" data-name="${this.escape(selectedName)}" data-nik="${this.escape(selectedNik)}" selected>
        ${this.escape(selectedName)} (${this.escape(selectedNik)})
      </option>`;
    }
    select.innerHTML = options;
  },

  renderKehadiranTable() {
    const tbody = document.getElementById('table-kehadiran-body');
    const keyword = this.globalKeyword.toLowerCase().trim();
    const filtered = State.kehadiran.filter(item => {
      const matchDate = !this.attendanceDateFilter || item.tanggal === this.attendanceDateFilter;
      const matchSearch = [
        item.tanggal, item.nik_karyawan, item.nama_karyawan, item.status, item.jam_masuk, item.keterangan
      ].some(value => String(value || '').toLowerCase().includes(keyword));
      return matchDate && matchSearch;
    });

    document.getElementById('showing-kehadiran').textContent =
      `Menampilkan ${filtered.length} dari ${State.kehadiran.length} catatan`;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 24px; color: var(--text-muted);">Tidak ada data kehadiran yang cocok.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(item => `
      <tr>
        <td>${this.formatDate(item.tanggal) || '-'}</td>
        <td><span class="asset-tag">${this.escape(item.nik_karyawan || '-')}</span></td>
        <td><strong>${this.escape(item.nama_karyawan)}</strong></td>
        <td>${this.getAttendanceBadge(item.status)}</td>
        <td>${this.escape(item.jam_masuk || '-')}</td>
        <td>${this.escape(item.keterangan || '-')}</td>
        <td style="text-align: center;">
          <div class="action-buttons" style="justify-content: center;">
            <button class="btn-icon edit" title="Edit Kehadiran" onclick="app.editKehadiran('${item.id}')">✏️</button>
            <button class="btn-icon delete" title="Hapus Kehadiran" onclick="app.deleteKehadiran('${item.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openKehadiranModal(kehadiran = null) {
    const form = document.getElementById('form-kehadiran');
    form.reset();
    this.populateKehadiranKaryawanDropdown(
      kehadiran ? kehadiran.karyawan_id : '',
      kehadiran ? kehadiran.nama_karyawan : '',
      kehadiran ? kehadiran.nik_karyawan : ''
    );
    document.getElementById('modal-kehadiran-title').innerHTML = kehadiran
      ? '<span>✏️</span> Edit Kehadiran'
      : '<span>🗓️</span> Catat Kehadiran';
    document.getElementById('kehadiran-id').value = kehadiran ? kehadiran.id : '';
    document.getElementById('kehadiran-tanggal').value = kehadiran ? kehadiran.tanggal || '' : this.getTodayDate();
    document.getElementById('kehadiran-status').value = kehadiran ? kehadiran.status || 'Hadir' : 'Hadir';
    document.getElementById('kehadiran-jam-masuk').value = kehadiran ? kehadiran.jam_masuk || '' : '';
    document.getElementById('kehadiran-keterangan').value = kehadiran ? kehadiran.keterangan || '' : '';
    this.openModal('modal-kehadiran');
  },

  async saveKehadiran(e) {
    e.preventDefault();
    const id = document.getElementById('kehadiran-id').value;
    const employeeSelect = document.getElementById('kehadiran-karyawan');
    const selectedEmployee = employeeSelect.options[employeeSelect.selectedIndex];
    const status = document.getElementById('kehadiran-status').value;
    const payload = {
      tanggal: document.getElementById('kehadiran-tanggal').value,
      karyawan_id: employeeSelect.value,
      nama_karyawan: selectedEmployee.dataset.name || '',
      nik_karyawan: selectedEmployee.dataset.nik || '',
      status,
      jam_masuk: status === 'Hadir' ? document.getElementById('kehadiran-jam-masuk').value : '',
      keterangan: document.getElementById('kehadiran-keterangan').value.trim()
    };

    try {
      if (id) await updateDoc(doc(db, 'kehadiran', id), payload);
      else await addDoc(collection(db, 'kehadiran'), payload);
      this.closeModal('modal-kehadiran');
    } catch (err) {
      alert('Gagal menyimpan data kehadiran: ' + err.message);
    }
  },

  editKehadiran(id) {
    const item = State.kehadiran.find(kehadiran => kehadiran.id === id);
    if (item) this.openKehadiranModal(item);
  },

  async deleteKehadiran(id) {
    const item = State.kehadiran.find(kehadiran => kehadiran.id === id);
    if (!item || !confirm(`Yakin ingin menghapus catatan kehadiran ${item.nama_karyawan} tanggal ${item.tanggal}?`)) return;
    try {
      await deleteDoc(doc(db, 'kehadiran', id));
    } catch (err) {
      alert('Gagal menghapus data kehadiran: ' + err.message);
    }
  },

  // --- LAPORAN AUDIT & REKAPITULASI ---
  renderAuditReport() {
    const { hardware, network } = State;
    const tbody = document.getElementById('table-audit-body');
    const allAssets = [];
    const printDate = new Date();
    document.getElementById('print-date').textContent =
      `Tanggal cetak: ${printDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`;

    hardware.forEach(h => {
      allAssets.push({
        kode: h.kode,
        kelompok: 'End-User Hardware',
        nama: `${h.jenis} - ${h.merek}`,
        sn: h.sn,
        koneksi: h.mac || '-',
        pj: h.pemegang,
        status: h.status
      });
    });

    network.forEach(n => {
      allAssets.push({
        kode: n.kode,
        kelompok: 'Network & Server',
        nama: `${n.kategori} - ${n.nama}`,
        sn: '-',
        koneksi: `IP: ${n.ip || '-'} / MAC: ${n.mac || '-'}`,
        pj: n.lokasi,
        status: n.status
      });
    });

    const total = allAssets.length;
    const aktif = allAssets.filter(a => a.status === 'Aktif' || a.status === 'Online').length;
    const servis = allAssets.filter(a => a.status === 'Perlu Servis' || a.status === 'Maintenance').length;
    const rusak = allAssets.filter(a => a.status === 'Rusak' || a.status === 'Offline').length;

    document.getElementById('audit-total-aset').textContent = total;
    document.getElementById('audit-aset-aktif').textContent = aktif;
    document.getElementById('audit-aset-servis').textContent = servis;
    document.getElementById('audit-aset-rusak').textContent = rusak;

    if (allAssets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 24px; color: var(--text-muted);">Tidak ada aset yang terdaftar dalam audit.</td></tr>';
      return;
    }

    tbody.innerHTML = allAssets.map((item, index) => `
      <tr>
        <td class="row-num">${index + 1}</td>
        <td><span class="asset-tag">${this.escape(item.kode)}</span></td>
        <td><span class="badge ${item.kelompok === 'End-User Hardware' ? 'badge-info' : 'badge-gender male'}">${item.kelompok}</span></td>
        <td><strong>${this.escape(item.nama)}</strong></td>
        <td><span class="serial-num">${this.escape(item.sn)}</span></td>
        <td style="font-size: 0.78rem;">${this.escape(item.koneksi)}</td>
        <td>${this.escape(item.pj)}</td>
        <td>${this.getStatusBadge(item.status)}</td>
      </tr>
    `).join('');
  },

  printAuditReport() {
    this.navigateTo('audit');
    setTimeout(() => window.print(), 200);
  },

  // --- EKSPOR CSV ---
  downloadCSV(filename, csvContent) {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  csvCell(value) {
    return `"${String(value == null ? '' : value).replace(/"/g, '""')}"`;
  },

  exportKaryawanCSV() {
    let csv = 'No,NIK/NIP,Nama Lengkap,Divisi/Departemen,Jabatan,Tanggal Mulai,Akhir Masa Jabatan,Status Kepegawaian\n';
    State.karyawan.forEach((k, idx) => {
      csv += [idx + 1, k.nik, k.nama, k.divisi, k.jabatan, k.tanggal_mulai, k.akhir_jabatan, k.status_jabatan]
        .map(value => this.csvCell(value)).join(',') + '\n';
    });
    this.downloadCSV('Data_Karyawan_Agrinas.csv', csv);
  },

  exportHardwareCSV() {
    let csv = 'Kode Aset,Jenis Perangkat,Merek & Tipe,Serial Number,MAC Address,Pemegang,Kondisi,Tahun Beli\n';
    State.hardware.forEach(h => {
      csv += `"${h.kode}","${h.jenis}","${h.merek}","${h.sn}","${h.mac || '-'}","${h.pemegang}","${h.status}","${h.tahun || '-'}"\n`;
    });
    this.downloadCSV('Inventaris_Hardware_Agrinas.csv', csv);
  },

  exportNetworkCSV() {
    let csv = 'Kode Aset,Nama Perangkat,Kategori,IP Address,MAC Address,Lokasi Penempatan,Status\n';
    State.network.forEach(n => {
      csv += `"${n.kode}","${n.nama}","${n.kategori}","${n.ip || '-'}","${n.mac || '-'}","${n.lokasi}","${n.status}"\n`;
    });
    this.downloadCSV('Network_Server_Agrinas.csv', csv);
  },

  exportKendaraanCSV() {
    let csv = 'No Polisi,Jenis Kendaraan,Merk & Tipe,Tahun,Pemegang,Jatuh Tempo Pajak / STNK,Kondisi\n';
    State.kendaraan.forEach(item => {
      csv += [item.no_polisi, item.jenis, item.merk_tipe, item.tahun, item.pemegang, item.jatuh_tempo_stnk, item.kondisi]
        .map(value => this.csvCell(value)).join(',') + '\n';
    });
    this.downloadCSV('Kendaraan_Operasional_Agrinas.csv', csv);
  },

  exportKehadiranCSV() {
    let csv = 'Tanggal,NIK,Nama Karyawan,Status,Jam Masuk,Keterangan\n';
    State.kehadiran.forEach(item => {
      csv += [item.tanggal, item.nik_karyawan, item.nama_karyawan, item.status, item.jam_masuk, item.keterangan]
        .map(value => this.csvCell(value)).join(',') + '\n';
    });
    this.downloadCSV('Data_Kehadiran_Agrinas.csv', csv);
  },

  exportAuditCSV() {
    let csv = 'Kode Aset,Kategori,Nama Perangkat,Serial Number,IP Address,MAC Address,Penanggung Jawab / Lokasi,Status\n';
    State.hardware.forEach(h => {
      csv += `"${h.kode}","End-User Hardware","${h.jenis} - ${h.merek}","${h.sn}","-","${h.mac || '-'}","${h.pemegang}","${h.status}"\n`;
    });
    State.network.forEach(n => {
      csv += `"${n.kode}","Network & Server","${n.kategori} - ${n.nama}","-","${n.ip || '-'}","${n.mac || '-'}","${n.lokasi}","${n.status}"\n`;
    });
    this.downloadCSV('Laporan_Audit_Aset_IT_Agrinas.csv', csv);
  },

  // --- PENGATURAN (BACKUP, RESTORE & PROFIL FIREBASE) ---
  async saveProfile(e) {
    e.preventDefault();
    if (!State.user) return;

    const newName = document.getElementById('settings-name').value.trim();
    const newPass = document.getElementById('settings-password').value.trim();

    try {
      await updateProfile(State.user, { displayName: newName });
      if (newPass) {
        if (newPass.length < 6) {
          alert('Password baru Firebase minimal 6 karakter!');
          return;
        }
        await updatePassword(State.user, newPass);
      }
      this.updateProfileUI(State.user);
      alert('Profil & Keamanan Akun berhasil diperbarui di Firebase!');
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        alert('Demi keamanan, silakan Logout lalu Login kembali terlebih dahulu sebelum mengganti password.');
      } else {
        alert('Gagal memperbarui profil: ' + err.message);
      }
    }
  },

  backupDatabase() {
    const json = JSON.stringify({
      version: '2.0-firebase',
      exportedAt: new Date().toISOString(),
      karyawan: State.karyawan,
      hardware: State.hardware,
      network: State.network,
      kendaraan: State.kendaraan,
      kehadiran: State.kehadiran
    }, null, 2);

    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Backup_Cloud_Agrinas_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  restoreDatabase() {
    const fileInput = document.getElementById('input-restore-file');
    if (!fileInput.files || fileInput.files.length === 0) {
      alert('Silakan pilih file cadangan berformat .json terlebih dahulu!');
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data.karyawan)) {
          for (const item of data.karyawan) {
            const { id, ...rest } = item;
            await addDoc(collection(db, 'karyawan'), rest);
          }
        }
        if (Array.isArray(data.hardware)) {
          for (const item of data.hardware) {
            const { id, ...rest } = item;
            await addDoc(collection(db, 'hardware'), rest);
          }
        }
        if (Array.isArray(data.network)) {
          for (const item of data.network) {
            const { id, ...rest } = item;
            await addDoc(collection(db, 'network'), rest);
          }
        }
        if (Array.isArray(data.kendaraan)) {
          for (const item of data.kendaraan) {
            const { id, ...rest } = item;
            await addDoc(collection(db, 'kendaraan'), rest);
          }
        }
        if (Array.isArray(data.kehadiran)) {
          for (const item of data.kehadiran) {
            const { id, ...rest } = item;
            await addDoc(collection(db, 'kehadiran'), rest);
          }
        }
        fileInput.value = '';
        alert('Data JSON berhasil diunggah ke Cloud Firestore!');
      } catch (err) {
        alert('Gagal memulihkan data: ' + err.message);
      }
    };
    reader.readAsText(file);
  },

  async resetDatabase() {
    if (confirm('Tambahkan kembali kumpulan data contoh (dummy data) ke Cloud Firestore?')) {
      try {
        for (const item of DEFAULT_KARYAWAN) await addDoc(collection(db, 'karyawan'), item);
        for (const item of DEFAULT_HARDWARE) await addDoc(collection(db, 'hardware'), item);
        for (const item of DEFAULT_NETWORK) await addDoc(collection(db, 'network'), item);
        alert('Data contoh berhasil ditambahkan ke Firestore!');
      } catch (err) {
        alert('Gagal menambahkan data contoh: ' + err.message);
      }
    }
  },

  // --- MODAL UTILITY ---
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  },

  // --- PENCARIAN LINTAS DATABASE ---
  searchAcrossDatabase(keyword) {
    const k = (keyword || '').toLowerCase().trim();
    const matchedKaryawan = State.karyawan.filter(item =>
      (item.nama || '').toLowerCase().includes(k) ||
      (item.nik || '').toLowerCase().includes(k) ||
      (item.divisi || '').toLowerCase().includes(k) ||
      (item.jabatan || '').toLowerCase().includes(k) ||
      (item.tanggal_mulai || '').toLowerCase().includes(k) ||
      (item.akhir_jabatan || '').toLowerCase().includes(k) ||
      (item.status_jabatan || '').toLowerCase().includes(k)
    );

    const matchedHardware = State.hardware.filter(item =>
      (item.kode || '').toLowerCase().includes(k) ||
      (item.jenis || '').toLowerCase().includes(k) ||
      (item.merek || '').toLowerCase().includes(k) ||
      (item.sn || '').toLowerCase().includes(k) ||
      (item.mac || '').toLowerCase().includes(k) ||
      (item.pemegang || '').toLowerCase().includes(k)
    );

    const matchedNetwork = State.network.filter(item =>
      (item.kode || '').toLowerCase().includes(k) ||
      (item.nama || '').toLowerCase().includes(k) ||
      (item.kategori || '').toLowerCase().includes(k) ||
      (item.ip || '').toLowerCase().includes(k) ||
      (item.mac || '').toLowerCase().includes(k) ||
      (item.lokasi || '').toLowerCase().includes(k)
    );

    const matchedKendaraan = State.kendaraan.filter(item =>
      [item.no_polisi, item.jenis, item.merk_tipe, item.tahun, item.pemegang, item.jatuh_tempo_stnk, item.kondisi]
        .some(value => String(value || '').toLowerCase().includes(k))
    );

    const matchedKehadiran = State.kehadiran.filter(item =>
      [item.tanggal, item.nik_karyawan, item.nama_karyawan, item.status, item.jam_masuk, item.keterangan]
        .some(value => String(value || '').toLowerCase().includes(k))
    );

    return {
      karyawan: matchedKaryawan,
      hardware: matchedHardware,
      network: matchedNetwork,
      kendaraan: matchedKendaraan,
      kehadiran: matchedKehadiran,
      total: matchedKaryawan.length + matchedHardware.length + matchedNetwork.length +
        matchedKendaraan.length + matchedKehadiran.length
    };
  },

  renderSearchPopup(results, query) {
    const container = document.getElementById('search-results-content');
    if (results.total === 0) {
      container.innerHTML = `<div class="search-result-empty">Tidak ada hasil untuk "<strong>${this.escape(query)}</strong>".</div>`;
      return;
    }

    let html = '';
    if (results.hardware.length > 0) {
      html += `<div class="search-result-group"><span>💻 End-User Hardware (${results.hardware.length})</span></div>`;
      results.hardware.slice(0, 4).forEach(h => {
        html += `
          <div class="search-result-item" onclick="app.selectSearchResult('hardware')">
            <div class="item-main">
              <div class="item-title">${this.escape(h.kode)} &bull; ${this.escape(h.merek)}</div>
              <div class="item-sub">Pemegang: ${this.escape(h.pemegang)} | S/N: ${this.escape(h.sn)}</div>
            </div>
            <div>${this.getStatusBadge(h.status)}</div>
          </div>
        `;
      });
    }

    if (results.karyawan.length > 0) {
      html += `<div class="search-result-group"><span>👥 Data Karyawan (${results.karyawan.length})</span></div>`;
      results.karyawan.slice(0, 4).forEach(k => {
        html += `
          <div class="search-result-item" onclick="app.selectSearchResult('karyawan')">
            <div class="item-main">
              <div class="item-title">${this.escape(k.nama)} &bull; <small style="color:var(--text-muted)">${this.escape(k.nik)}</small></div>
              <div class="item-sub">${this.escape(k.jabatan)} &bull; ${this.escape(k.divisi)}</div>
            </div>
            <span class="btn btn-outline btn-sm">Lihat</span>
          </div>
        `;
      });
    }

    if (results.network.length > 0) {
      html += `<div class="search-result-group"><span>🌐 Network &amp; Server (${results.network.length})</span></div>`;
      results.network.slice(0, 4).forEach(n => {
        html += `
          <div class="search-result-item" onclick="app.selectSearchResult('network')">
            <div class="item-main">
              <div class="item-title">${this.escape(n.kode)} &bull; ${this.escape(n.nama)}</div>
              <div class="item-sub">IP: ${this.escape(n.ip || '-')} &bull; Lokasi: ${this.escape(n.lokasi)}</div>
            </div>
            <div>${this.getStatusBadge(n.status)}</div>
          </div>
        `;
      });
    }

    if (results.kendaraan.length > 0) {
      html += `<div class="search-result-group"><span>🚙 Kendaraan Operasional (${results.kendaraan.length})</span></div>`;
      results.kendaraan.slice(0, 4).forEach(item => {
        html += `
          <div class="search-result-item" onclick="app.selectSearchResult('kendaraan')">
            <div class="item-main">
              <div class="item-title">${this.escape(item.no_polisi)} &bull; ${this.escape(item.merk_tipe)}</div>
              <div class="item-sub">${this.escape(item.jenis)} | Pemegang: ${this.escape(item.pemegang)}</div>
            </div>
            ${this.getVehicleConditionBadge(item.kondisi)}
          </div>
        `;
      });
    }

    if (results.kehadiran.length > 0) {
      html += `<div class="search-result-group"><span>🗓️ Data Kehadiran (${results.kehadiran.length})</span></div>`;
      results.kehadiran.slice(0, 4).forEach(item => {
        html += `
          <div class="search-result-item" onclick="app.selectSearchResult('kehadiran')">
            <div class="item-main">
              <div class="item-title">${this.escape(item.nama_karyawan)} &bull; ${this.escape(item.tanggal)}</div>
              <div class="item-sub">${this.escape(item.nik_karyawan || '-')} | ${this.escape(item.jam_masuk || 'Tanpa jam masuk')}</div>
            </div>
            ${this.getAttendanceBadge(item.status)}
          </div>
        `;
      });
    }

    container.innerHTML = html;
  },

  selectSearchResult(viewId) {
    document.getElementById('search-results-popup').classList.remove('show');
    if (viewId === 'kehadiran') {
      this.attendanceDateFilter = '';
      document.getElementById('filter-kehadiran-tanggal').value = '';
    }
    this.navigateTo(viewId);
  },

  // --- HELPERS ---
  updateHeaderDate() {
    const dateElement = document.getElementById('header-current-date');
    if (!dateElement) return;
    dateElement.textContent = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());
  },

  getTodayDate() {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  },

  formatDate(date) {
    if (!date) return '';
    const parsedDate = new Date(`${date}T00:00:00`);
    return Number.isNaN(parsedDate.getTime())
      ? this.escape(date)
      : parsedDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  getTenureSummary(karyawan) {
    if (karyawan.status_jabatan === 'Karyawan Tetap' || (!karyawan.status_jabatan && !karyawan.akhir_jabatan)) return 'Tetap';
    if (!karyawan.akhir_jabatan) return 'Tanpa tanggal akhir';
    const today = new Date(`${this.getTodayDate()}T00:00:00`);
    const endDate = new Date(`${karyawan.akhir_jabatan}T00:00:00`);
    if (Number.isNaN(endDate.getTime())) return 'Tanggal akhir tidak valid';
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / 86400000);
    const endDateLabel = this.formatDate(karyawan.akhir_jabatan);
    if (daysRemaining < 0) return `Akhir ${endDateLabel} - berakhir ${Math.abs(daysRemaining)} hari lalu`;
    if (daysRemaining === 0) return `Akhir ${endDateLabel} - berakhir hari ini`;
    return `Akhir ${endDateLabel} - sisa ${daysRemaining} hari`;
  },

  getEmploymentBadge(status) {
    const value = status || 'Karyawan Tetap';
    let style = 'badge-success';
    if (value === 'Kontrak (PKWT)') style = 'badge-info';
    if (value === 'Masa Percobaan') style = 'badge-warning';
    if (value === 'Selesai / Pensiun') style = 'badge-danger';
    return `<span class="badge ${style}">${this.escape(value)}</span>`;
  },

  getVehicleConditionBadge(status) {
    let style = 'badge-success';
    if (status === 'Perawatan / Servis') style = 'badge-warning';
    if (status === 'Rusak') style = 'badge-danger';
    return `<span class="badge ${style}">${this.escape(status || '-')}</span>`;
  },

  getAttendanceBadge(status) {
    let style = 'badge-danger';
    if (status === 'Hadir') style = 'badge-success';
    if (status === 'Izin' || status === 'Cuti') style = 'badge-warning';
    if (status === 'Sakit') style = 'badge-info';
    return `<span class="badge ${style}">${this.escape(status || '-')}</span>`;
  },

  getStatusBadge(status) {
    const s = (status || '').toLowerCase();
    if (s === 'aktif' || s === 'online') return `<span class="badge-status active">${this.escape(status)}</span>`;
    if (s === 'perlu servis' || s === 'maintenance') return `<span class="badge-status service">${this.escape(status)}</span>`;
    if (s === 'rusak' || s === 'offline') return `<span class="badge-status broken">${this.escape(status)}</span>`;
    return `<span class="badge">${this.escape(status)}</span>`;
  },

  escape(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  },

  // --- EVENT BINDING ---
  bindEvents() {
    const dateFilter = document.getElementById('filter-kehadiran-tanggal');
    dateFilter.value = this.getTodayDate();
    this.attendanceDateFilter = dateFilter.value;
    dateFilter.addEventListener('change', () => {
      this.attendanceDateFilter = dateFilter.value;
      this.renderKehadiranTable();
    });

    document.getElementById('form-login').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-password').value;
      this.login(email, pass);
    });

    const trigger = document.getElementById('user-profile-trigger');
    const dropdown = document.getElementById('user-dropdown');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });
    window.addEventListener('click', () => dropdown.classList.remove('show'));

    document.getElementById('btn-open-user-info').addEventListener('click', () => this.openModal('modal-user-info'));
    document.getElementById('btn-nav-settings').addEventListener('click', () => this.navigateTo('pengaturan'));
    document.getElementById('btn-logout').addEventListener('click', () => this.logout());

    const mobileNavToggle = document.getElementById('btn-sidebar-toggle');
    const mobileNavBackdrop = document.getElementById('mobile-nav-backdrop');
    const closeMobileNav = () => {
      document.body.classList.remove('mobile-nav-open');
      mobileNavToggle.setAttribute('aria-expanded', 'false');
      mobileNavToggle.setAttribute('aria-label', 'Buka menu navigasi');
    };
    mobileNavToggle.addEventListener('click', () => {
      const isOpen = document.body.classList.toggle('mobile-nav-open');
      mobileNavToggle.setAttribute('aria-expanded', String(isOpen));
      mobileNavToggle.setAttribute('aria-label', isOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi');
    });
    mobileNavBackdrop.addEventListener('click', closeMobileNav);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileNav();
    });

    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        if (link.dataset.view) {
          this.navigateTo(link.dataset.view);
          closeMobileNav();
        }
      });
    });

    const searchInput = document.getElementById('global-search-input');
    const searchPopup = document.getElementById('search-results-popup');

    const performLiveSearch = () => {
      const val = searchInput.value.trim();
      this.globalKeyword = val;
      this.renderCurrentView();

      if (val.length >= 1) {
        const results = this.searchAcrossDatabase(val);
        this.renderSearchPopup(results, val);
        searchPopup.classList.add('show');
      } else {
        searchPopup.classList.remove('show');
      }
    };

    searchInput.addEventListener('input', performLiveSearch);
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim().length >= 1) performLiveSearch();
    });

    document.getElementById('btn-global-search').addEventListener('click', () => {
      const val = searchInput.value.trim();
      if (!val) return;
      this.globalKeyword = val;
      const results = this.searchAcrossDatabase(val);
      if (results.hardware.length > 0) this.navigateTo('hardware');
      else if (results.karyawan.length > 0) this.navigateTo('karyawan');
      else if (results.network.length > 0) this.navigateTo('network');
      else if (results.kendaraan.length > 0) this.navigateTo('kendaraan');
      else if (results.kehadiran.length > 0) {
        this.attendanceDateFilter = '';
        dateFilter.value = '';
        this.navigateTo('kehadiran');
      }
      else this.renderCurrentView();
      searchPopup.classList.remove('show');
    });

    window.addEventListener('click', (e) => {
      if (!e.target.closest('.search-box-wrapper')) searchPopup.classList.remove('show');
    });

    const hwTabs = document.querySelectorAll('#hardware-filter-tabs .filter-tab');
    hwTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        hwTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.hardwareFilter = tab.dataset.filter;
        this.renderHardwareTable();
      });
    });

    const netTabs = document.querySelectorAll('#network-filter-tabs .filter-tab');
    netTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        netTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.networkFilter = tab.dataset.filter;
        this.renderNetworkTable();
      });
    });

    document.getElementById('hardware-status-filter').addEventListener('change', (e) => {
      this.hardwareStatusFilter = e.target.value;
      this.renderHardwareTable();
    });
    document.getElementById('network-status-filter').addEventListener('change', (e) => {
      this.networkStatusFilter = e.target.value;
      this.renderNetworkTable();
    });

    document.getElementById('hardware-jenis').addEventListener('change', (e) => {
      this.updateMacPlaceholder(e.target.value);
    });

    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal(btn.dataset.close));
    });

    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    });

    document.getElementById('form-karyawan').addEventListener('submit', (e) => this.saveKaryawan(e));
    document.getElementById('form-hardware').addEventListener('submit', (e) => this.saveHardware(e));
    document.getElementById('form-network').addEventListener('submit', (e) => this.saveNetwork(e));
    document.getElementById('form-kendaraan').addEventListener('submit', (e) => this.saveKendaraan(e));
    document.getElementById('form-kehadiran').addEventListener('submit', (e) => this.saveKehadiran(e));
    document.getElementById('form-update-profile').addEventListener('submit', (e) => this.saveProfile(e));
    document.getElementById('btn-print-qr').addEventListener('click', () => this.printQrLabel());

    document.getElementById('btn-tambah-karyawan').addEventListener('click', () => this.openKaryawanModal());
    document.getElementById('btn-tambah-hardware').addEventListener('click', () => this.openHardwareModal());
    document.getElementById('btn-tambah-network').addEventListener('click', () => this.openNetworkModal());
    document.getElementById('btn-tambah-kendaraan').addEventListener('click', () => this.openKendaraanModal());
    document.getElementById('btn-tambah-kehadiran').addEventListener('click', () => this.openKehadiranModal());
  }
};

window.app = App;

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});