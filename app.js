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
  getDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp
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
const ADMIN_EMAIL = 'admin@agrinas.co.id';
const DEFAULT_USER_ROLES = {
  'admin@agrinas.co.id': 'Admin Agrinas',
  'pimpinan@agrinas.co.id': 'Pimpinan',
  'hrd@agrinas.co.id': 'HRD',
  'manajer@agrinas.co.id': 'Manajer IT'
};
const USER_PROFILE_BY_EMAIL = {
  'admin@agrinas.co.id': { name: 'Admin Agrinas', role: 'Admin Agrinas', initial: 'A' },
  'manajer@agrinas.co.id': { name: 'Manajer IT', role: 'Manajer IT', initial: 'M' },
  'pimpinan@agrinas.co.id': { name: 'Pimpinan', role: 'Pimpinan', initial: 'P' },
  'hrd@agrinas.co.id': { name: 'HRD', role: 'HRD', initial: 'H' }
};
const ACCESS_DENIED_MESSAGE = 'Akses ditolak. Portal ini hanya dapat diakses oleh Admin Agrinas, Pimpinan, HRD, dan Manajer IT.';
const DEFAULT_IT_SUPPORT_PHONE = '6282138098917';
const AUDIT_SIGNATURE_ADMIN_KEY = 'agrinas.auditSignature.admin';
const AUDIT_SIGNATURE_MANAGER_KEY = 'agrinas.auditSignature.manager';

function getUserFacingError(error) {
  const message = error && typeof error.message === 'string'
    ? error.message
    : 'Silakan coba lagi.';
  return message.replace(/\b(?:Cloud\s+Firestore|Firestore|Firebase(?:\s+Authentication|Error)?)\b/gi, 'sistem');
}

// =======================================================================
// 2. DATA AWAL (SEED DUMMY JIKA FIRESTORE MASIH KOSONG)
// =======================================================================
const DEFAULT_KARYAWAN = [
  { nik: 'AG-2021-001', nama: 'Ahmad Fauzi', departemen: 'IT Infrastructure', divisi: 'IT Infrastructure', jabatan: 'Manager IT', lokasi: 'Kantor Pusat', statusInventaris: 'Ada', keteranganInventaris: 'Memegang 1 unit Dell OptiPlex 7090 (IT-PC-001).' },
  { nik: 'AG-2022-015', nama: 'Siti Rahmawati', departemen: 'Keuangan & Akuntansi', divisi: 'Keuangan & Akuntansi', jabatan: 'Staf Keuangan', lokasi: 'Regional Pontianak', statusInventaris: 'Ada', keteranganInventaris: 'Memegang 1 unit Lenovo ThinkPad T14 Gen 3 (IT-LT-002).' },
  { nik: 'AG-2021-008', nama: 'Budi Santoso', departemen: 'IT Infrastructure', divisi: 'IT Infrastructure', jabatan: 'Network Engineer', lokasi: 'Kantor Pusat', statusInventaris: 'Ada', keteranganInventaris: 'Memegang 1 unit Monitor Samsung S24R350 (IT-MN-004).' },
  { nik: 'AG-2023-042', nama: 'Dewi Lestari', departemen: 'HRD & GA', divisi: 'HRD & GA', jabatan: 'HR Specialist', lokasi: 'Distrik I', statusInventaris: 'Ada', keteranganInventaris: 'Memegang 1 unit HP ProDesk 400 G7 (IT-PC-005).' },
  { nik: 'AG-2022-029', nama: 'Rizky Pratama', departemen: 'Operasional Kebun', divisi: 'Operasional Kebun', jabatan: 'Supervisor Operasional', lokasi: 'Distrik II', statusInventaris: 'Tidak', keteranganInventaris: 'Tidak ada perangkat IT pribadi yang tercatat atas nama karyawan.' }
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
  adminEmails: [ADMIN_EMAIL],
  userRoles: { ...DEFAULT_USER_ROLES },
  itSupportPhone: DEFAULT_IT_SUPPORT_PHONE,
  karyawan: [],
  hardware: [],
  network: [],
  kendaraan: [],
  kehadiran: [],
  activityLogs: [],
  hardwareLoaded: false,
  networkLoaded: false,
  unsubscribers: []
};

const App = {
  currentView: 'dashboard',
  hardwareFilter: 'all',
  networkFilter: 'all',
  hardwareStatusFilter: 'all',
  networkStatusFilter: 'all',
  inventoryCategoryFilter: 'all',
  inventorySearchQuery: '',
  expandedHardwareIds: new Set(),
  attendanceDateFilter: '',
  globalKeyword: '',
  expandedKaryawanIds: new Set(),
  dateRefreshTimer: null,
  assetDeepLinkHandled: false,
  publicQrData: null,

  init() {
    this.updateHeaderDate();
    this.loadAuditSignatureSettings();
    if (!this.dateRefreshTimer) {
      this.dateRefreshTimer = setInterval(() => this.updateHeaderDate(), 60000);
    }
    this.bindEvents();
    this.initializePublicQr();
    this.listenAuthState();
  },

  // --- AUTENTIKASI FIREBASE ---
  listenAuthState() {
    const loginOverlay = document.getElementById('login-overlay');
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        State.user = user;
        await this.loadAdminEmails();
        if (auth.currentUser !== user) return;
        if (!this.hasAuthorizedAccess(user)) {
          await this.denyUnauthorizedUser();
          return;
        }
        loginOverlay.style.display = 'none';
        document.getElementById('login-alert').style.display = 'none';
        this.updateProfileUI(user);
        await this.seedIfEmpty();
        this.startRealtimeListeners();
      } else {
        State.user = null;
        document.body.classList.remove('role-viewer');
        this.stopRealtimeListeners();
        this.renderAll();
        loginOverlay.style.display = 'flex';
      }
    });
  },

  async login(email, password) {
    const alertBox = document.getElementById('login-alert');
    const btnSubmit = document.getElementById('btn-login-submit');
    alertBox.style.display = 'none';
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Memverifikasi...';

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      console.error('Login error:', error.code);
      alertBox.style.display = 'block';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        alertBox.textContent = 'Email atau kata sandi salah. Periksa kembali kredensial akun Anda.';
      } else if (error.code === 'auth/too-many-requests') {
        alertBox.textContent = 'Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat.';
      } else {
        alertBox.textContent = 'Gagal masuk: ' + getUserFacingError(error);
      }
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Masuk ke Sistem';
    }
  },

  async denyUnauthorizedUser() {
    const alertBox = document.getElementById('login-alert');
    const activeUser = auth.currentUser;
    document.getElementById('login-overlay').style.display = 'flex';
    alertBox.textContent = ACCESS_DENIED_MESSAGE;
    alertBox.style.display = 'block';
    State.user = null;
    document.body.classList.remove('role-viewer');
    this.stopRealtimeListeners();
    this.renderAll();
    if (activeUser) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Gagal mengeluarkan akun yang tidak berwenang:', error);
      }
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
    const email = user.email || ADMIN_EMAIL;
    const mappedProfile = USER_PROFILE_BY_EMAIL[email.trim().toLowerCase()];
    const displayName = mappedProfile ? mappedProfile.name : (user.displayName || 'Admin Agrinas');
    const initial = mappedProfile ? mappedProfile.initial : displayName.charAt(0).toUpperCase();

    document.getElementById('header-user-avatar').textContent = initial;
    document.getElementById('info-modal-avatar').textContent = initial;
    document.getElementById('header-user-name').textContent = displayName;

    document.getElementById('dropdown-user-name').textContent = displayName;
    document.getElementById('dropdown-user-role').textContent = email;

    document.getElementById('info-account-name').textContent = displayName;
    document.getElementById('info-account-email').textContent = email;

    document.getElementById('settings-name').value = displayName;
    document.getElementById('settings-email').value = email;
    document.getElementById('settings-password').value = '';
    this.updateRoleUI(user);
    this.renderAdminEmailList();
  },

  updateRoleUI(user) {
    const isAdmin = this.isAdmin(user);
    const email = user && user.email ? user.email.trim().toLowerCase() : '';
    const roleLabel = (USER_PROFILE_BY_EMAIL[email] && USER_PROFILE_BY_EMAIL[email].role) || this.getUserRole(user);
    const headerRole = document.getElementById('header-user-role');
    const accountRole = document.getElementById('info-account-role');

    headerRole.textContent = roleLabel;
    headerRole.classList.toggle('role-admin', isAdmin);
    headerRole.classList.toggle('role-viewer', !isAdmin);
    document.body.classList.toggle('role-viewer', !isAdmin);
    accountRole.textContent = roleLabel;
    accountRole.classList.toggle('badge-success', isAdmin);
    accountRole.classList.toggle('badge-info', !isAdmin);
  },

  isAdmin(user = State.user) {
    return Boolean(
      user &&
      user.email &&
      State.adminEmails.includes(user.email.trim().toLowerCase())
    );
  },

  getUserRole(user = State.user) {
    if (!user || !user.email) return '';
    const email = user.email.trim().toLowerCase();
    if (State.adminEmails.includes(email)) return 'Admin Agrinas';
    return State.userRoles[email] || '';
  },

  hasAuthorizedAccess(user = State.user) {
    return Boolean(this.getUserRole(user));
  },

  normalizeAdminEmails(emails) {
    if (!Array.isArray(emails)) return [ADMIN_EMAIL];
    const normalized = [...new Set(
      emails
        .filter(email => typeof email === 'string')
        .map(email => email.trim().toLowerCase())
        .filter(Boolean)
    )];
    return normalized.length ? normalized : [ADMIN_EMAIL];
  },

  normalizeUserRoles(userRoles) {
    if (!userRoles || typeof userRoles !== 'object' || Array.isArray(userRoles)) {
      return { ...DEFAULT_USER_ROLES };
    }

    const allowedRoles = new Set(Object.values(DEFAULT_USER_ROLES));
    const normalized = {};
    Object.entries(userRoles).forEach(([email, role]) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail.includes('@') && allowedRoles.has(role)) {
        normalized[normalizedEmail] = role;
      }
    });
    return normalized;
  },

  async loadAdminEmails() {
    try {
      const snapshot = await getDoc(doc(db, 'settings', 'roles'));
      const settings = snapshot.exists() ? snapshot.data() : {};
      State.adminEmails = this.normalizeAdminEmails(
        settings.adminEmails
      );
      State.userRoles = this.normalizeUserRoles(settings.userRoles);
    } catch (error) {
      console.error('Gagal membaca daftar akses pengelola dari Firestore:', error);
      State.adminEmails = [ADMIN_EMAIL];
      State.userRoles = { ...DEFAULT_USER_ROLES };
    }
  },

  renderAdminEmailList() {
    const list = document.getElementById('admin-email-list');
    if (!list) return;
    list.innerHTML = State.adminEmails.map(email => `
      <li class="admin-email-item">
        <span>${this.escape(email)}</span>
        <button type="button" class="btn btn-outline btn-remove-admin" data-remove-admin="${this.escape(email)}"
          ${State.adminEmails.length <= 1 ? 'disabled title="Minimal satu Admin Agrinas harus tetap terdaftar"' : ''}>
          Hapus
        </button>
      </li>
    `).join('');
  },

  setAdminAccessStatus(message, isError = false) {
    const status = document.getElementById('admin-access-status');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('error', isError);
  },

  async saveAdminEmailList(emails) {
    const normalized = this.normalizeAdminEmails(emails);
    await setDoc(doc(db, 'settings', 'roles'), { adminEmails: normalized }, { merge: true });
    State.adminEmails = normalized;
    if (State.user) {
      if (this.hasAuthorizedAccess(State.user)) this.updateRoleUI(State.user);
      else await this.denyUnauthorizedUser();
    }
    this.renderAdminEmailList();
  },

  async addAdminEmail(e) {
    e.preventDefault();
    if (!this.requireAdmin()) return;

    const input = document.getElementById('admin-access-email');
    const email = input.value.trim().toLowerCase();
    if (!input.checkValidity()) {
      input.reportValidity();
      return;
    }
    if (State.adminEmails.includes(email)) {
      this.setAdminAccessStatus('Email tersebut sudah terdaftar sebagai Admin Agrinas.', true);
      this.showToast('Email tersebut sudah terdaftar sebagai Admin Agrinas.', 'warning');
      return;
    }

    try {
      await this.saveAdminEmailList([...State.adminEmails, email]);
      input.value = '';
      this.setAdminAccessStatus(`Akses Admin Agrinas ditambahkan untuk ${email}.`);
      this.showToast('Akses Admin Agrinas berhasil ditambahkan.');
    } catch (error) {
      console.error('Gagal menambahkan Admin Agrinas:', error);
      this.setAdminAccessStatus('Gagal menyimpan perubahan akses Admin. Silakan coba kembali.', true);
      this.showToast('Gagal menambahkan akses Admin Agrinas.', 'error');
    }
  },

  async removeAdminEmail(email) {
    if (!this.requireAdmin()) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!State.adminEmails.includes(normalizedEmail)) {
      this.showToast('Email Admin Agrinas tidak ditemukan.', 'warning');
      return;
    }
    if (State.adminEmails.length <= 1) {
      this.setAdminAccessStatus('Minimal satu Admin Agrinas harus tetap terdaftar.', true);
      this.showToast('Minimal satu Admin Agrinas harus tetap terdaftar.', 'warning');
      return;
    }
    if (!confirm(`Hapus ${normalizedEmail} dari daftar Admin Agrinas?`)) return;

    const currentUser = State.user;
    const currentEmail = currentUser.email || '';
    const wasCurrentUserRemoved = currentEmail.trim().toLowerCase() === normalizedEmail;
    try {
      await this.saveAdminEmailList(State.adminEmails.filter(adminEmail => adminEmail !== normalizedEmail));
      if (wasCurrentUserRemoved) {
        const remainingRole = this.getUserRole(currentUser);
        if (remainingRole) {
          alert(`Akses penuh akun ini telah dilepas. Akun tetap dapat mengakses sistem sebagai ${remainingRole} (baca-saja).`);
        } else if (State.user) {
          await this.denyUnauthorizedUser();
          return;
        }
      } else {
        this.setAdminAccessStatus(`Akses Admin Agrinas untuk ${normalizedEmail} telah dihapus.`);
      }
      this.showToast('Akses Admin Agrinas berhasil dihapus.');
    } catch (error) {
      console.error('Gagal menghapus Admin Agrinas:', error);
      this.setAdminAccessStatus('Gagal menyimpan perubahan akses Admin. Silakan coba kembali.', true);
      this.showToast('Gagal menghapus akses Admin Agrinas.', 'error');
    }
  },

  requireAdmin() {
    if (this.isAdmin()) return true;
    alert('Aksi ini hanya tersedia untuk Admin Agrinas.');
    return false;
  },

  showToast(message, type = 'success') {
    const region = document.querySelector('.toast-region');
    if (!region) return;

    while (region.children.length >= 4) {
      region.firstElementChild.remove();
    }

    const toast = document.createElement('div');
    toast.className = `app-toast app-toast--${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.textContent = message;
    region.appendChild(toast);

    window.setTimeout(() => {
      toast.classList.add('is-leaving');
      window.setTimeout(() => toast.remove(), 180);
    }, 4500);
  },

  async findDuplicateRecord(collectionNames, fieldName, value, excludedCollection = '', excludedId = '') {
    const normalizedValue = String(value || '').trim().toLowerCase();
    if (!normalizedValue) return null;

    const snapshots = await Promise.all(
      collectionNames.map(collectionName => getDocs(collection(db, collectionName)))
    );

    for (let index = 0; index < collectionNames.length; index += 1) {
      const collectionName = collectionNames[index];
      const duplicate = snapshots[index].docs.find(record => {
        if (collectionName === excludedCollection && record.id === excludedId) return false;
        return String(record.data()[fieldName] || '').trim().toLowerCase() === normalizedValue;
      });
      if (duplicate) return { collectionName, record: duplicate.data() };
    }
    return null;
  },

  // --- SEED DATA AWAL JIKA KOLEKSI MASIH KOSONG ---
  async seedIfEmpty() {
    if (!this.isAdmin()) return;
    try {
      const kSnap = await getDocs(collection(db, 'karyawan'));
      if (kSnap.empty) {
        for (const item of DEFAULT_KARYAWAN) {
          await addDoc(collection(db, 'karyawan'), { ...item, updatedAt: serverTimestamp() });
        }
      }
      const hSnap = await getDocs(collection(db, 'hardware'));
      if (hSnap.empty) {
        for (const item of DEFAULT_HARDWARE) {
          await addDoc(collection(db, 'hardware'), { ...item, updatedAt: serverTimestamp() });
        }
      }
      const nSnap = await getDocs(collection(db, 'network'));
      if (nSnap.empty) {
        for (const item of DEFAULT_NETWORK) {
          await addDoc(collection(db, 'network'), { ...item, updatedAt: serverTimestamp() });
        }
      }
    } catch (err) {
      console.error('Gagal melakukan seed awal Firestore:', err);
    }
  },

  // --- REAL-TIME FIRESTORE LISTENERS ---
  startRealtimeListeners() {
    this.stopRealtimeListeners();
    this.assetDeepLinkHandled = false;
    State.hardwareLoaded = false;
    State.networkLoaded = false;
    this.renderDashboard();

    const unsubAdminRoles = onSnapshot(doc(db, 'settings', 'roles'), async (snapshot) => {
      const settings = snapshot.exists() ? snapshot.data() : {};
      State.adminEmails = this.normalizeAdminEmails(settings.adminEmails);
      State.userRoles = this.normalizeUserRoles(settings.userRoles);
      this.renderAdminEmailList();
      if (State.user) {
        if (this.hasAuthorizedAccess(State.user)) this.updateRoleUI(State.user);
        else await this.denyUnauthorizedUser();
      }
    }, (error) => {
      console.error('Gagal menyinkronkan daftar akses pengelola:', error);
    });

    const unsubItSupportSettings = onSnapshot(doc(db, 'settings', 'it_support'), (snapshot) => {
      this.applyItSupportPhone(
        snapshot.exists() ? snapshot.data().whatsappNumber : DEFAULT_IT_SUPPORT_PHONE
      );
    }, (error) => {
      console.error('Gagal menyinkronkan nomor WhatsApp IT Support:', error);
      this.setItSupportSettingsStatus('Nomor WhatsApp tidak dapat disinkronkan. Periksa koneksi atau izin Firestore.', true);
    });

    const unsubKaryawan = onSnapshot(collection(db, 'karyawan'), (snapshot) => {
      State.karyawan = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      this.renderAll();
    });

    const unsubHardware = onSnapshot(collection(db, 'hardware'), (snapshot) => {
      State.hardware = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      State.hardwareLoaded = true;
      this.renderAll();
      this.resolveAssetDeepLink();
    });

    const unsubNetwork = onSnapshot(collection(db, 'network'), (snapshot) => {
      State.network = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      State.networkLoaded = true;
      this.renderAll();
      this.resolveAssetDeepLink();
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

    const activityQuery = query(
      collection(db, 'activity_logs'),
      orderBy('timestamp', 'desc'),
      limit(8)
    );
    const unsubActivityLogs = onSnapshot(activityQuery, (snapshot) => {
      State.activityLogs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      this.renderDashboard();
      this.renderDataUpdateStamp();
    }, (error) => {
      console.error('Gagal menyinkronkan riwayat aktivitas:', error);
    });

    State.unsubscribers = [
      unsubAdminRoles,
      unsubItSupportSettings,
      unsubKaryawan,
      unsubHardware,
      unsubNetwork,
      unsubKendaraan,
      unsubKehadiran,
      unsubActivityLogs
    ];
  },

  stopRealtimeListeners() {
    State.unsubscribers.forEach(unsub => unsub());
    State.unsubscribers = [];
    this.resetSessionData();
  },

  // Bersihkan seluruh data sesi (State, pencarian, baris yang terbuka)
  resetSessionData() {
    State.karyawan = [];
    State.hardware = [];
    State.network = [];
    State.kendaraan = [];
    State.kehadiran = [];
    State.activityLogs = [];
    State.hardwareLoaded = false;
    State.networkLoaded = false;
    this.clearGlobalSearch();
    this.expandedHardwareIds.clear();
    this.expandedKaryawanIds.clear();
  },

  clearGlobalSearch() {
    this.globalKeyword = '';
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) searchInput.value = '';
    const searchPopup = document.getElementById('search-results-popup');
    if (searchPopup) searchPopup.classList.remove('show');
  },

  // --- SPA NAVIGATION ---
  navigateTo(viewId, options = {}) {
    this.currentView = viewId;
    if (!options.keepSearch) this.clearGlobalSearch();
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
      targetView.classList.remove('page-enter');
      void targetView.offsetWidth;
    }

    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.view === viewId);
    });

    document.querySelectorAll('.view-section').forEach(view => {
      view.classList.remove('active');
    });
    if (targetView) {
      targetView.classList.add('active', 'page-enter');
      document.body.classList.remove('navigation-progress');
      void document.body.offsetWidth;
      document.body.classList.add('navigation-progress');
    }

    const titles = {
      dashboard: { main: 'Dashboard Utama Aset', sub: 'RINGKASAN SISTEM & STATISTIK' },
      karyawan: { main: 'Master Karyawan', sub: 'DAFTAR PEGAWAI & PEMEGANG ASET' },
      hardware: { main: 'Master Barang', sub: 'DAFTAR BARANG & SPESIFIKASI TEKNIS' },
      inventaris: { main: 'Data Inventaris', sub: 'REKAP BARANG & PEMEGANG INVENTARIS' },
      network: { main: 'Network & Server', sub: 'INFRASTRUKTUR JARINGAN & SERVER' },
      kendaraan: { main: 'Kendaraan Operasional', sub: 'INVENTARIS DAN STATUS KENDARAAN' },
      kehadiran: { main: 'Data Kehadiran', sub: 'CATATAN KEHADIRAN KARYAWAN' },
      audit: { main: 'Laporan Audit', sub: 'REKAPITULASI FISIK & CETAK BERITA ACARA' },
      pengaturan: { main: 'Pengaturan Sistem', sub: 'PROFIL AKUN & PENGATURAN SISTEM' }
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
      case 'inventaris': this.renderDataInventarisTable(); break;
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
    this.renderDataInventarisTable();
    this.renderNetworkTable();
    this.renderKendaraanTable();
    this.renderKehadiranTable();
    this.renderAuditReport();
    this.renderDataUpdateStamp();
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
    const statServis = document.getElementById('stat-servis');
    statServis.textContent = servisCount;
    statServis.classList.toggle('has-alert', servisCount > 0);
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
            <div class="item-title">
              <svg class="activity-icon activity-icon--warning" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z"></path>
                <path d="M12 9v4M12 17h.01"></path>
              </svg>
              <span>${criticalCount} Perangkat Membutuhkan Tindakan</span>
            </div>
            <div class="item-time">${hardwareCriticals.length} hardware dan ${networkCriticals.length} network perlu diperiksa</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="app.showCriticalAssets()">Cek</button>
        </div>
      `;
    }

    activitiesHtml += `
      <div class="activity-item">
        <div>
          <div class="item-title">
            <svg class="activity-icon activity-icon--sync" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 4 16.3"></path>
              <path d="M8 16v4l-2-2M16 20v-4l2 2"></path>
            </svg>
            <span>Sinkronisasi Data Aktif</span>
          </div>
          <div class="item-time">Data tersimpan secara real-time di server.</div>
        </div>
        <span class="badge badge-success">ONLINE</span>
      </div>
      <div class="activity-item">
        <div>
          <div class="item-title">
            <svg class="activity-icon activity-icon--organization" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"></path>
              <path d="M9 9h.01M15 9h.01M9 12h.01M15 12h.01"></path>
            </svg>
            <span>PT Agrinas Palma Nusantara</span>
          </div>
          <div class="item-time">Audit Tagging Aset IT Siap Dicetak.</div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="app.navigateTo('audit')">Laporan</button>
      </div>
    `;

    const collectionNames = {
      karyawan: 'Karyawan',
      hardware: 'Hardware',
      network: 'Network & Server',
      kendaraan: 'Kendaraan',
      kehadiran: 'Kehadiran'
    };
    activitiesHtml += '<h3 class="activity-log-heading">Riwayat Perubahan Data</h3>';
    if (State.activityLogs.length === 0) {
      activitiesHtml += '<div class="activity-log-empty">Belum ada aktivitas perubahan data.</div>';
    } else {
      activitiesHtml += State.activityLogs.slice(0, 8).map(log => {
        const date = new Date(Number(log.timestamp));
        const timestamp = Number.isNaN(date.getTime())
          ? '-'
          : date.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
        const entityName = collectionNames[log.collection] || log.collection || 'Data';
        return `
          <div class="activity-item activity-log-item">
            <div>
              <div class="item-title">${this.escape(log.action)} · ${this.escape(entityName)}</div>
              <div class="item-time">${this.escape(log.item)} · ${this.escape(log.actor)}</div>
            </div>
            <time class="activity-log-timestamp">${this.escape(timestamp)}</time>
          </div>
        `;
      }).join('');
    }
    activityList.innerHTML = activitiesHtml;
  },

  // --- CRUD: KARYAWAN ---
  getKaryawanDepartemen(karyawan) {
    return karyawan.departemen || karyawan.divisi || '-';
  },

  getKaryawanInventoryBadge(status) {
    if (status === 'Ada') {
      return '<span class="badge-inventory-status has-inventory">Ada</span>';
    }
    if (status === 'Tidak') {
      return '<span class="badge-inventory-status no-inventory">Tidak</span>';
    }
    return '<span class="badge-inventory-status inventory-unknown">Belum dilengkapi</span>';
  },

  getKaryawanStatus(status) {
    return status || 'Belum diatur';
  },

  getKaryawanStatusBadge(status) {
    const value = this.getKaryawanStatus(status);
    const statusClass = value === 'APN (HO)'
      ? 'employee-status-apn'
      : value === 'Ex-DPN (Agrinas)'
        ? 'employee-status-ex-dpn'
        : value === 'Karyawan Tetap'
          ? 'employee-status-permanent'
          : value === 'Karyawan Kontrak (PKWT)'
            ? 'employee-status-contract'
            : 'employee-status-unknown';
    return `<span class="employee-status-badge ${statusClass}">${this.escape(value)}</span>`;
  },

  renderKaryawanTenure(karyawan) {
    const startDate = karyawan.tanggal_mulai ? this.formatDate(karyawan.tanggal_mulai) : '-';
    const summary = this.getTenureSummary(karyawan);
    const endLine = karyawan.akhir_jabatan
      ? `Selesai / Pensiun: ${this.formatDate(karyawan.akhir_jabatan)}`
      : summary;
    const summaryLine = karyawan.akhir_jabatan
      ? `<div class="employee-tenure-summary${summary.includes('Peringatan:') ? ' is-warning' : ''}">${summary}</div>`
      : '';
    return `
      <div class="employee-tenure-start">Mulai: ${startDate}</div>
      <div class="employee-tenure-end">${endLine}</div>
      ${summaryLine}
      ${this.getEmploymentBadge(karyawan.status_jabatan)}
    `;
  },

  getKaryawanTenureExportValue(karyawan) {
    return this.getTenureSummary(karyawan);
  },

  renderKaryawanExpandedDetails(karyawan) {
    return `
      <div class="employee-expanded-grid">
        <div class="employee-expanded-item">
          <span>NIK / NIP</span>
          <strong>${this.escape(karyawan.nik || '-')}</strong>
        </div>
        <div class="employee-expanded-item">
          <span>Jabatan</span>
          <strong>${this.escape(karyawan.jabatan || '-')}</strong>
        </div>
        <div class="employee-expanded-item employee-expanded-item--tenure">
          <span>Masa Jabatan / Estimasi Pensiun</span>
          <div>${this.renderKaryawanTenure(karyawan)}</div>
        </div>
        <div class="employee-expanded-item">
          <span>Status Inventaris IT</span>
          <div>${this.getKaryawanInventoryBadge(karyawan.statusInventaris)}</div>
        </div>
        <div class="employee-expanded-item employee-expanded-item--wide">
          <span>Penjelasan Inventaris IT</span>
          <p>${this.escape(karyawan.keteranganInventaris || '-')}</p>
        </div>
      </div>
    `;
  },

  renderKaryawanTable() {
    const tbody = document.getElementById('table-karyawan-body');
    const keyword = this.globalKeyword.toLowerCase().trim();

    const filtered = State.karyawan.filter(k =>
      [
        k.nama, k.nik, k.jabatan, k.departemen, k.divisi, k.lokasi,
        k.status_karyawan, k.statusInventaris, k.keteranganInventaris,
        k.tanggal_mulai, k.akhir_jabatan, k.status_jabatan
      ].some(value => String(value || '').toLowerCase().includes(keyword))
    );

    document.getElementById('showing-karyawan').textContent = `Menampilkan ${filtered.length} dari ${State.karyawan.length} karyawan`;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center employee-table-empty">Tidak ada data karyawan yang cocok.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((k, index) => {
      const id = this.escape(k.id);
      const expanded = this.expandedKaryawanIds.has(k.id);
      const detailsId = `employee-details-${id}`;
      return `
        <tr class="employee-summary-row${expanded ? ' is-expanded' : ''}">
          <td class="employee-expand-cell">
            <button type="button" class="employee-expand-button" data-karyawan-action="toggle"
              data-id="${id}" aria-expanded="${expanded}" aria-controls="${detailsId}"
              title="${expanded ? 'Tutup' : 'Buka'} detail ${this.escape(k.nama)}"
              aria-label="${expanded ? 'Tutup' : 'Buka'} detail ${this.escape(k.nama)}">
              ${this.actionIcon('chevron')}
            </button>
          </td>
          <td class="employee-number-cell">${index + 1}</td>
          <td class="employee-name-cell"><strong>${this.escape(k.nama || '-')}</strong></td>
          <td>${this.escape(k.lokasi || '-')}</td>
          <td>${this.escape(this.getKaryawanDepartemen(k))}</td>
          <td>${this.getKaryawanStatusBadge(k.status_karyawan)}</td>
          <td class="employee-actions-cell">
            <div class="employee-actions">
              <button type="button" class="btn-icon edit" title="Edit Karyawan" aria-label="Edit ${this.escape(k.nama)}" data-karyawan-action="edit" data-id="${id}">
                ${this.actionIcon('edit')}
              </button>
              <button type="button" class="btn-icon delete" title="Hapus Karyawan" aria-label="Hapus ${this.escape(k.nama)}" data-karyawan-action="delete" data-id="${id}">
                ${this.actionIcon('delete')}
              </button>
            </div>
          </td>
        </tr>
        <tr class="employee-detail-row${expanded ? ' is-expanded' : ''}">
          <td colspan="7">
            <div class="employee-detail-clip" id="${detailsId}" aria-hidden="${!expanded}">
              <div class="employee-detail-inner">${this.renderKaryawanExpandedDetails(k)}</div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openKaryawanModal(karyawan = null) {
    if (!this.requireAdmin()) return;
    const title = document.getElementById('modal-karyawan-title');
    const form = document.getElementById('form-karyawan');
    form.reset();

    if (karyawan) {
      title.textContent = 'Edit Master Karyawan';
      document.getElementById('karyawan-id').value = karyawan.id;
      document.getElementById('karyawan-nik').value = karyawan.nik;
      document.getElementById('karyawan-nama').value = karyawan.nama;
      document.getElementById('karyawan-departemen').value = karyawan.departemen || karyawan.divisi || '';
      document.getElementById('karyawan-jabatan').value = karyawan.jabatan;
      document.getElementById('karyawan-lokasi').value = karyawan.lokasi || '';
      document.getElementById('karyawan-status-karyawan').value =
        karyawan.status_karyawan || (karyawan.status_jabatan === 'Kontrak (PKWT)' ? 'Karyawan Kontrak (PKWT)' : '');
      document.getElementById('karyawan-status-inventaris').value = karyawan.statusInventaris || '';
      document.getElementById('karyawan-keterangan-inventaris').value = karyawan.keteranganInventaris || '';
      document.getElementById('karyawan-tanggal-mulai').value = karyawan.tanggal_mulai || '';
      document.getElementById('karyawan-akhir-jabatan').value = karyawan.akhir_jabatan || '';
      document.getElementById('karyawan-status-jabatan').value = karyawan.status_jabatan || 'Karyawan Tetap';
    } else {
      title.textContent = 'Tambah Master Karyawan';
      document.getElementById('karyawan-id').value = '';
      document.getElementById('karyawan-status-karyawan').value = '';
      document.getElementById('karyawan-status-jabatan').value = 'Karyawan Tetap';
    }
    this.updateKaryawanInventorySuggestion();
    this.openModal('modal-karyawan');
  },

  async saveKaryawan(e) {
    e.preventDefault();
    if (!this.requireAdmin()) return;
    const id = document.getElementById('karyawan-id').value;
    const payload = {
      nik: document.getElementById('karyawan-nik').value.trim(),
      nama: document.getElementById('karyawan-nama').value.trim(),
      departemen: document.getElementById('karyawan-departemen').value.trim(),
      divisi: document.getElementById('karyawan-departemen').value.trim(),
      jabatan: document.getElementById('karyawan-jabatan').value.trim(),
      lokasi: document.getElementById('karyawan-lokasi').value.trim(),
      status_karyawan: document.getElementById('karyawan-status-karyawan').value,
      statusInventaris: document.getElementById('karyawan-status-inventaris').value,
      keteranganInventaris: document.getElementById('karyawan-keterangan-inventaris').value.trim(),
      tanggal_mulai: document.getElementById('karyawan-tanggal-mulai').value,
      akhir_jabatan: document.getElementById('karyawan-akhir-jabatan').value,
      status_jabatan: document.getElementById('karyawan-status-jabatan').value,
      updatedAt: serverTimestamp()
    };

    try {
      const duplicate = await this.findDuplicateRecord(['karyawan'], 'nik', payload.nik, 'karyawan', id);
      if (duplicate) {
        this.showToast(`NIK/NIP "${payload.nik}" sudah digunakan. Gunakan nomor yang berbeda.`, 'warning');
        return;
      }

      if (id) {
        const oldItem = State.karyawan.find(k => k.id === id);
        await updateDoc(doc(db, 'karyawan', id), payload);
        await this.logActivity('Edit', 'karyawan', `${payload.nama} (${payload.nik})`);

        if (oldItem && oldItem.nama !== payload.nama) {
          const affectedHw = State.hardware.filter(h => (h.pemegang || '').toLowerCase() === oldItem.nama.toLowerCase());
          for (const hw of affectedHw) {
            await updateDoc(doc(db, 'hardware', hw.id), {
              pemegang: payload.nama,
              updatedAt: serverTimestamp()
            });
          }
          const affectedVehicles = State.kendaraan.filter(vehicle =>
            (vehicle.pemegang || '').toLowerCase() === oldItem.nama.toLowerCase()
          );
          for (const vehicle of affectedVehicles) {
            await updateDoc(doc(db, 'kendaraan', vehicle.id), {
              pemegang: payload.nama,
              updatedAt: serverTimestamp()
            });
          }
        }
      } else {
        await addDoc(collection(db, 'karyawan'), payload);
        await this.logActivity('Tambah', 'karyawan', `${payload.nama} (${payload.nik})`);
      }
      this.closeModal('modal-karyawan');
      this.showToast(id ? 'Data karyawan berhasil diperbarui.' : 'Data karyawan berhasil disimpan.');
    } catch (err) {
      this.showToast('Gagal menyimpan data karyawan: ' + getUserFacingError(err), 'error');
    }
  },

  editKaryawan(id) {
    const item = State.karyawan.find(k => k.id === id);
    if (item) this.openKaryawanModal(item);
  },

  toggleKaryawanRow(id) {
    if (this.expandedKaryawanIds.has(id)) {
      this.expandedKaryawanIds.delete(id);
    } else {
      this.expandedKaryawanIds.add(id);
    }
    this.renderKaryawanTable();
  },

  showKaryawanDetail(id) {
    const karyawan = State.karyawan.find(item => item.id === id);
    if (!karyawan) return;

    document.getElementById('detail-karyawan-nik').textContent = karyawan.nik || '-';
    document.getElementById('detail-karyawan-nama').textContent = karyawan.nama || '-';
    document.getElementById('detail-karyawan-jabatan').textContent = karyawan.jabatan || '-';
    document.getElementById('detail-karyawan-departemen').textContent = this.getKaryawanDepartemen(karyawan);
    document.getElementById('detail-karyawan-lokasi').textContent = karyawan.lokasi || '-';
    document.getElementById('detail-karyawan-status-inventaris').innerHTML =
      this.getKaryawanInventoryBadge(karyawan.statusInventaris);
    document.getElementById('detail-karyawan-keterangan-inventaris').textContent =
      karyawan.keteranganInventaris || '-';
    document.getElementById('detail-karyawan-status-jabatan').innerHTML =
      this.getEmploymentBadge(karyawan.status_jabatan);
    document.getElementById('detail-karyawan-tanggal-mulai').textContent =
      karyawan.tanggal_mulai ? this.formatDate(karyawan.tanggal_mulai) : 'Belum diisi';
    document.getElementById('detail-karyawan-akhir-jabatan').textContent =
      karyawan.akhir_jabatan ? this.formatDate(karyawan.akhir_jabatan) : 'Belum diatur';
    document.getElementById('detail-karyawan-masa-jabatan').textContent =
      this.getTenureSummary(karyawan);
    this.openModal('modal-karyawan-detail');
  },

  updateKaryawanInventorySuggestion() {
    const suggestionBox = document.getElementById('karyawan-inventory-suggestion');
    const status = document.getElementById('karyawan-status-inventaris').value;
    const employeeName = document.getElementById('karyawan-nama').value.trim();
    suggestionBox.hidden = true;
    delete suggestionBox.dataset.suggestion;
    if (status !== 'Ada' || !employeeName) return;

    const normalizedName = employeeName.toLowerCase();
    const devices = State.hardware.filter(item =>
      String(item.pemegang || '').trim().toLowerCase() === normalizedName
    );
    if (devices.length === 0) return;

    const details = devices.map(item =>
      `${item.jenis || 'Perangkat'} ${item.merek || ''} (${item.kode || 'tanpa kode'})`.trim()
    );
    const suggestion = `Memegang ${devices.length} unit: ${details.join('; ')}.`;
    suggestionBox.dataset.suggestion = suggestion;
    document.getElementById('karyawan-inventory-suggestion-text').textContent =
      `Saran berdasarkan data Hardware: ${suggestion}`;
    suggestionBox.hidden = false;
  },

  async deleteKaryawan(id) {
    if (!this.requireAdmin()) return;
    const karyawan = State.karyawan.find(item => item.id === id);
    if (!karyawan) {
      this.showToast('Data karyawan tidak ditemukan. Muat ulang daftar sebelum mencoba lagi.', 'warning');
      return;
    }
    if (confirm(`Yakin ingin menghapus data karyawan "${karyawan.nama}"?`)) {
      try {
        await deleteDoc(doc(db, 'karyawan', id));
        await this.logActivity('Hapus', 'karyawan', `${karyawan.nama} (${karyawan.nik || '-'})`);
        this.showToast('Data karyawan berhasil dihapus.');
      } catch (err) {
        this.showToast('Gagal menghapus karyawan: ' + getUserFacingError(err), 'error');
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
      return `<option value="${this.escape(k.nama)}" ${isSelected}>${this.escape(k.nama)} (${this.escape(this.getKaryawanDepartemen(k))})</option>`;
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

  getHardwareCategory(item) {
    const category = String(item.jenis || '').trim().toLowerCase();
    return category === 'pc desktop' ? 'PC' : (item.jenis || '');
  },

  findHardwareEmployee(item) {
    const holder = String(item.pemegang || '').trim().toLowerCase();
    if (!holder) return null;
    return State.karyawan.find(employee =>
      String(employee.nama || '').trim().toLowerCase() === holder
    ) || null;
  },

  renderHardwareExpandedDetails(item) {
    return `
      <div class="barang-expanded-grid">
        <div class="barang-expanded-item">
          <span>Prosesor</span>
          <strong>${this.escape(item.prosesor || '-')}</strong>
        </div>
        <div class="barang-expanded-item">
          <span>RAM</span>
          <strong>${this.escape(item.ram || '-')}</strong>
        </div>
        <div class="barang-expanded-item">
          <span>Penyimpanan (HDD / SSD)</span>
          <strong>${this.escape(item.penyimpanan || '-')}</strong>
        </div>
        <div class="barang-expanded-item">
          <span>Serial Number</span>
          <strong>${this.escape(item.sn || '-')}</strong>
        </div>
        <div class="barang-expanded-item">
          <span>Pemegang</span>
          <strong>${this.escape(item.pemegang || '-')}</strong>
        </div>
        <div class="barang-expanded-item">
          <span>MAC Address</span>
          <strong>${this.escape(item.mac || '-')}</strong>
        </div>
        <div class="barang-expanded-item barang-expanded-item--wide">
          <span>Keterangan Teknis</span>
          <p>${this.escape(item.keterangan_teknis || '-')}</p>
        </div>
      </div>
    `;
  },

  renderHardwareTable() {
    const tbody = document.getElementById('table-hardware-body');
    const keyword = this.globalKeyword.toLowerCase().trim();

    const filtered = State.hardware.filter(item => {
      const matchFilter = this.hardwareFilter === 'all' ||
        this.getHardwareCategory(item).toLowerCase() === this.hardwareFilter.toLowerCase() ||
        (this.hardwareFilter === 'PC Desktop' && this.getHardwareCategory(item) === 'PC');
      const matchStatus = this.matchesAssetStatus(item.status, this.hardwareStatusFilter);
      const matchSearch = [
        item.kode, item.jenis, item.merek, item.sn, item.mac, item.pemegang,
        item.prosesor, item.ram, item.penyimpanan, item.keterangan_teknis
      ].some(value => String(value || '').toLowerCase().includes(keyword));
      return matchFilter && matchStatus && matchSearch;
    });

    document.getElementById('showing-hardware').textContent = `Menampilkan ${filtered.length} dari ${State.hardware.length} barang`;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 24px; color: var(--text-muted);">Tidak ada barang yang cocok.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(item => {
      const id = this.escape(item.id);
      const expanded = this.expandedHardwareIds.has(item.id);
      const detailsId = `barang-details-${id}`;
      const year = item.tahun || item.tahun_perolehan || '-';
      return `
        <tr class="barang-summary-row${expanded ? ' is-expanded' : ''}">
          <td class="barang-expand-cell">
            <button type="button" class="barang-expand-button" data-hardware-action="toggle"
              data-id="${id}" aria-expanded="${expanded}" aria-controls="${detailsId}"
              title="${expanded ? 'Tutup' : 'Buka'} spesifikasi ${this.escape(item.kode)}"
              aria-label="${expanded ? 'Tutup' : 'Buka'} spesifikasi ${this.escape(item.kode)}">
              ${this.actionIcon('chevron')}
            </button>
          </td>
          <td><span class="asset-tag">${this.escape(item.kode || '-')}</span></td>
          <td><strong>${this.escape(this.getHardwareCategory(item) || '-')}</strong></td>
          <td class="barang-model-cell">${this.escape(item.merek || '-')}</td>
          <td>${this.escape(year)}</td>
          <td>${this.getStatusBadge(item.status)}</td>
          <td class="barang-actions-cell">
            <div class="barang-actions">
              <button type="button" class="btn-icon edit" title="Edit Barang" aria-label="Edit ${this.escape(item.kode)}" data-hardware-action="edit" data-id="${id}">
                ${this.actionIcon('edit')}
              </button>
              <button type="button" class="btn-icon delete" title="Hapus Barang" aria-label="Hapus ${this.escape(item.kode)}" data-hardware-action="delete" data-id="${id}">
                ${this.actionIcon('delete')}
              </button>
              <button type="button" class="btn-icon qr" title="Lihat / Cetak QR" aria-label="Lihat atau cetak QR ${this.escape(item.kode)}" data-hardware-action="qr" data-id="${id}">
                ${this.actionIcon('qr')}
              </button>
            </div>
          </td>
        </tr>
        <tr class="barang-detail-row${expanded ? ' is-expanded' : ''}">
          <td colspan="7">
            <div class="barang-detail-clip" id="${detailsId}" aria-hidden="${!expanded}">
              <div class="barang-detail-inner">${this.renderHardwareExpandedDetails(item)}</div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openHardwareModal(hardware = null) {
    if (!this.requireAdmin()) return;
    const title = document.getElementById('modal-hardware-title');
    const form = document.getElementById('form-hardware');
    form.reset();

    this.populatePemegangDropdown(hardware ? hardware.pemegang : '');

    if (hardware) {
      title.textContent = 'Edit Master Barang';
      document.getElementById('hardware-id').value = hardware.id;
      document.getElementById('hardware-kode').value = hardware.kode;
      document.getElementById('hardware-jenis').value = hardware.jenis;
      document.getElementById('hardware-merek').value = hardware.merek;
      document.getElementById('hardware-sn').value = hardware.sn;
      document.getElementById('hardware-mac').value = hardware.mac === '-' ? '' : (hardware.mac || '');
      document.getElementById('hardware-pemegang').value = hardware.pemegang;
      document.getElementById('hardware-status').value = hardware.status;
      document.getElementById('hardware-tahun').value = hardware.tahun || '';
      document.getElementById('hardware-prosesor').value = hardware.prosesor || '';
      document.getElementById('hardware-ram').value = hardware.ram || '';
      document.getElementById('hardware-penyimpanan').value = hardware.penyimpanan || '';
      document.getElementById('hardware-keterangan-teknis').value = hardware.keterangan_teknis || '';
      this.updateMacPlaceholder(hardware.jenis);
    } else {
      title.textContent = 'Tambah Master Barang';
      document.getElementById('hardware-id').value = '';
      this.updateMacPlaceholder('');
    }
    this.openModal('modal-hardware');
  },

  async saveHardware(e) {
    e.preventDefault();
    if (!this.requireAdmin()) return;
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
      tahun: parseInt(document.getElementById('hardware-tahun').value, 10) || new Date().getFullYear(),
      prosesor: document.getElementById('hardware-prosesor').value.trim(),
      ram: document.getElementById('hardware-ram').value.trim(),
      penyimpanan: document.getElementById('hardware-penyimpanan').value.trim(),
      keterangan_teknis: document.getElementById('hardware-keterangan-teknis').value.trim(),
      updatedAt: serverTimestamp()
    };

    try {
      const duplicate = await this.findDuplicateRecord(
        ['hardware', 'network'],
        'kode',
        payload.kode,
        id ? 'hardware' : '',
        id
      );
      if (duplicate) {
        this.showToast(`Kode aset "${payload.kode}" sudah digunakan. Gunakan kode yang berbeda.`, 'warning');
        return;
      }

      if (id) {
        await updateDoc(doc(db, 'hardware', id), payload);
      } else {
        await addDoc(collection(db, 'hardware'), payload);
      }
      await this.logActivity(id ? 'Edit' : 'Tambah', 'hardware', `${payload.kode} - ${payload.jenis}`);
      this.closeModal('modal-hardware');
      this.showToast(id ? 'Data Master Barang berhasil diperbarui.' : 'Data Master Barang berhasil disimpan.');
    } catch (err) {
      this.showToast('Gagal menyimpan Master Barang: ' + getUserFacingError(err), 'error');
    }
  },

  editHardware(id) {
    const item = State.hardware.find(h => h.id === id);
    if (item) this.openHardwareModal(item);
  },

  async deleteHardware(id, kode) {
    if (!this.requireAdmin()) return;
    if (!State.hardware.some(item => item.id === id)) {
      this.showToast('Perangkat hardware tidak ditemukan. Muat ulang daftar sebelum mencoba lagi.', 'warning');
      return;
    }
    if (confirm(`Yakin ingin menghapus perangkat hardware [${kode}]?`)) {
      try {
        await deleteDoc(doc(db, 'hardware', id));
        await this.logActivity('Hapus', 'hardware', kode);
        this.showToast(`Perangkat hardware ${kode} berhasil dihapus.`);
      } catch (err) {
        this.showToast('Gagal menghapus perangkat hardware: ' + getUserFacingError(err), 'error');
      }
    }
  },

  renderDataInventarisTable() {
    const tbody = document.getElementById('table-inventaris-body');
    const keyword = this.inventorySearchQuery.trim().toLowerCase();
    const category = this.inventoryCategoryFilter;
    const filtered = State.hardware.filter(item => {
      const employee = this.findHardwareEmployee(item);
      const matchCategory = category === 'all' || this.getHardwareCategory(item).toLowerCase() === category.toLowerCase();
      const searchable = [
        item.kode, item.jenis, item.merek, item.pemegang,
        item.prosesor, item.ram, item.penyimpanan, item.keterangan_teknis,
        employee && employee.nama, employee && employee.lokasi,
        employee && this.getKaryawanDepartemen(employee)
      ];
      return matchCategory && searchable.some(value => String(value || '').toLowerCase().includes(keyword));
    });

    document.getElementById('showing-inventaris').textContent =
      `Menampilkan ${filtered.length} dari ${State.hardware.length} inventaris`;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center inventory-table-empty">Tidak ada inventaris yang cocok.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(item => {
      const employee = this.findHardwareEmployee(item);
      return `
        <tr>
          <td><span class="asset-tag">${this.escape(item.kode || '-')}</span></td>
          <td><strong>${this.escape(item.pemegang || '-')}</strong></td>
          <td>${this.escape(employee && employee.lokasi || '-')}</td>
          <td>${this.escape(employee ? this.getKaryawanDepartemen(employee) : '-')}</td>
          <td class="inventory-item-name">${this.escape(this.getHardwareCategory(item))} ${this.escape(item.merek || '')}</td>
          <td>${this.getStatusBadge(item.status)}</td>
          <td class="inventory-actions-cell">
            <button type="button" class="inventory-view-button" title="Lihat detail aset"
              aria-label="Lihat detail ${this.escape(item.kode)}"
              data-inventory-action="view" data-id="${this.escape(item.id)}">
              ${this.actionIcon('eye')}
              <span>View</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openInventoryDetail(id) {
    const item = State.hardware.find(asset => asset.id === id);
    if (!item) {
      this.showToast('Barang tidak ditemukan. Muat ulang Data Inventaris sebelum mencoba lagi.', 'warning');
      return;
    }
    const employee = this.findHardwareEmployee(item);
    const detailValues = {
      'inventory-detail-code': item.kode,
      'inventory-detail-type': this.getHardwareCategory(item),
      'inventory-detail-model': item.merek,
      'inventory-detail-holder': item.pemegang,
      'inventory-detail-nik': employee && employee.nik,
      'inventory-detail-position': employee && employee.jabatan,
      'inventory-detail-location': employee && employee.lokasi,
      'inventory-detail-department': employee && this.getKaryawanDepartemen(employee),
      'inventory-detail-year': item.tahun || item.tahun_perolehan,
      'inventory-detail-processor': item.prosesor,
      'inventory-detail-ram': item.ram,
      'inventory-detail-storage': item.penyimpanan,
      'inventory-detail-serial': item.sn,
      'inventory-detail-notes': item.keterangan_teknis
    };
    Object.entries(detailValues).forEach(([elementId, value]) => {
      document.getElementById(elementId).textContent = value || '-';
    });
    document.getElementById('inventory-detail-condition').innerHTML = this.getStatusBadge(item.status);
    document.getElementById('btn-inventory-detail-qr').dataset.assetId = item.id;
    this.openModal('modal-inventaris-detail');
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
            <button type="button" class="btn-icon edit" title="Edit Perangkat" aria-label="Edit ${this.escape(item.kode)}" data-network-action="edit" data-id="${this.escape(item.id)}">${this.actionIcon('edit')}</button>
            <button type="button" class="btn-icon delete" title="Hapus Perangkat" aria-label="Hapus ${this.escape(item.kode)}" data-network-action="delete" data-id="${this.escape(item.id)}">${this.actionIcon('delete')}</button>
            <button type="button" class="btn-icon qr" title="Lihat / Cetak QR" aria-label="Lihat atau cetak QR ${this.escape(item.kode)}" data-network-action="qr" data-id="${this.escape(item.id)}">${this.actionIcon('qr')}</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openNetworkModal(network = null) {
    if (!this.requireAdmin()) return;
    const title = document.getElementById('modal-network-title');
    const form = document.getElementById('form-network');
    form.reset();

    if (network) {
      title.textContent = 'Edit Network & Server';
      document.getElementById('network-id').value = network.id;
      document.getElementById('network-kode').value = network.kode;
      document.getElementById('network-nama').value = network.nama;
      document.getElementById('network-kategori').value = network.kategori;
      document.getElementById('network-ip').value = network.ip === '-' ? '' : (network.ip || '');
      document.getElementById('network-mac').value = network.mac === '-' ? '' : (network.mac || '');
      document.getElementById('network-lokasi').value = network.lokasi;
      document.getElementById('network-status').value = network.status;
    } else {
      title.textContent = 'Tambah Network & Server';
      document.getElementById('network-id').value = '';
    }
    this.openModal('modal-network');
  },

  async saveNetwork(e) {
    e.preventDefault();
    if (!this.requireAdmin()) return;
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
      status: document.getElementById('network-status').value,
      updatedAt: serverTimestamp()
    };

    try {
      const duplicate = await this.findDuplicateRecord(
        ['hardware', 'network'],
        'kode',
        payload.kode,
        id ? 'network' : '',
        id
      );
      if (duplicate) {
        this.showToast(`Kode aset "${payload.kode}" sudah digunakan. Gunakan kode yang berbeda.`, 'warning');
        return;
      }

      if (id) {
        await updateDoc(doc(db, 'network', id), payload);
      } else {
        await addDoc(collection(db, 'network'), payload);
      }
      await this.logActivity(id ? 'Edit' : 'Tambah', 'network', `${payload.kode} - ${payload.nama}`);
      this.closeModal('modal-network');
      this.showToast(id ? 'Perangkat jaringan berhasil diperbarui.' : 'Perangkat jaringan berhasil disimpan.');
    } catch (err) {
      this.showToast('Gagal menyimpan perangkat jaringan: ' + getUserFacingError(err), 'error');
    }
  },

  editNetwork(id) {
    const item = State.network.find(n => n.id === id);
    if (item) this.openNetworkModal(item);
  },

  async deleteNetwork(id, kode) {
    if (!this.requireAdmin()) return;
    if (!State.network.some(item => item.id === id)) {
      this.showToast('Perangkat jaringan tidak ditemukan. Muat ulang daftar sebelum mencoba lagi.', 'warning');
      return;
    }
    if (confirm(`Yakin ingin menghapus perangkat jaringan [${kode}]?`)) {
      try {
        await deleteDoc(doc(db, 'network', id));
        await this.logActivity('Hapus', 'network', kode);
        this.showToast(`Perangkat jaringan ${kode} berhasil dihapus.`);
      } catch (err) {
        this.showToast('Gagal menghapus perangkat jaringan: ' + getUserFacingError(err), 'error');
      }
    }
  },

  resolveAssetDeepLink() {
    if (this.assetDeepLinkHandled || !State.hardwareLoaded || !State.networkLoaded) return;
    const assetCode = new URLSearchParams(window.location.search).get('aset');
    if (!assetCode) {
      this.assetDeepLinkHandled = true;
      return;
    }

    const normalizedCode = assetCode.trim().toLowerCase();
    const hardware = State.hardware.find(item =>
      String(item.kode || '').trim().toLowerCase() === normalizedCode
    );
    const network = State.network.find(item =>
      String(item.kode || '').trim().toLowerCase() === normalizedCode
    );
    const type = hardware ? 'hardware' : network ? 'network' : '';
    const item = hardware || network;
    this.assetDeepLinkHandled = true;

    if (!item) {
      alert(`Aset dengan kode "${assetCode}" tidak ditemukan.`);
      return;
    }
    this.navigateTo(type);
    this.openAssetQr(type, item.id);
  },

  initializePublicQr() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('qr') !== '1') return;

    const publicData = {
      kode: (params.get('kode') || '').trim().slice(0, 80),
      jenis: (params.get('jenis') || '').trim().slice(0, 100),
      merk: (params.get('merk') || '').trim().slice(0, 140),
      pic: (params.get('pic') || '').trim().slice(0, 120),
      status: (params.get('status') || '').trim().slice(0, 80)
    };
    // Nomor WA tujuan dikunci ke nomor resmi IT Support; parameter ?wa= sengaja diabaikan.
    State.itSupportPhone = DEFAULT_IT_SUPPORT_PHONE;
    this.publicQrData = publicData;

    document.getElementById('public-qr-code').textContent = publicData.kode || '-';
    document.getElementById('public-qr-type').textContent = publicData.jenis || '-';
    document.getElementById('public-qr-model').textContent = publicData.merk || '-';
    document.getElementById('public-qr-pic').textContent = publicData.pic || '-';
    document.getElementById('public-qr-status').innerHTML = this.getStatusBadge(
      publicData.status || 'Status tidak tersedia'
    );

    this.updatePublicQrReportLink();

    const overlay = document.getElementById('public-qr-overlay');
    overlay.hidden = false;
    document.getElementById('btn-close-public-qr').focus();
  },

  updatePublicQrReportLink() {
    const reportLink = document.getElementById('public-qr-report');
    const error = document.getElementById('public-qr-error');
    const publicData = this.publicQrData;
    if (!publicData || !publicData.kode) {
      error.textContent = 'Kode aset tidak tersedia pada tautan QR ini. Silakan hubungi Admin IT.';
      error.hidden = false;
      reportLink.removeAttribute('href');
      reportLink.setAttribute('aria-disabled', 'true');
      reportLink.tabIndex = -1;
      return;
    }

    const phone = this.normalizeItSupportPhone(State.itSupportPhone);
    const reportMessage = [
      'Halo IT Support, saya ingin melaporkan kendala aset.',
      `Kode Aset: ${publicData.kode}`,
      `Jenis Barang: ${publicData.jenis || 'Tidak tersedia'}`,
      `Merek & Tipe: ${publicData.merk || 'Tidak tersedia'}`,
      `Pemegang aset: ${publicData.pic || 'Tidak tersedia'}`
    ].join('\n');
    const whatsappUrl = new URL(`https://wa.me/${encodeURIComponent(phone)}`);
    whatsappUrl.searchParams.set('text', reportMessage);
    reportLink.href = whatsappUrl.toString();
    reportLink.removeAttribute('aria-disabled');
    reportLink.tabIndex = 0;
    error.hidden = true;
  },

  closePublicQr() {
    document.getElementById('public-qr-overlay').hidden = true;
    const loginOverlay = document.getElementById('login-overlay');
    if (window.getComputedStyle(loginOverlay).display !== 'none') {
      document.getElementById('login-email').focus();
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
      pemegang: type === 'hardware' ? item.pemegang || '-' : item.pemegang || item.lokasi || '-',
      jenis: type === 'hardware' ? item.jenis || 'Hardware' : item.kategori || 'Network',
      status: item.status || '-'
    };
    const holderLabel = type === 'hardware' ? 'Pemegang' : 'Pemegang / Lokasi';
    const qrUrl = new URL(window.location.pathname, window.location.origin);
    qrUrl.searchParams.set('qr', '1');
    qrUrl.searchParams.set('kode', labelData.kode);
    qrUrl.searchParams.set('jenis', labelData.jenis);
    qrUrl.searchParams.set('merk', labelData.model);
    qrUrl.searchParams.set('pic', labelData.pemegang);
    qrUrl.searchParams.set('status', labelData.status);

    document.getElementById('qr-asset-code').textContent = labelData.kode;
    document.getElementById('qr-asset-name').textContent = labelData.nama;
    document.getElementById('qr-asset-model').textContent = labelData.model;
    document.getElementById('qr-asset-holder-label').textContent = `${holderLabel}:`;
    document.getElementById('qr-asset-holder').textContent = labelData.pemegang;
    const qrContainer = document.getElementById('asset-qr-code');
    qrContainer.replaceChildren();
    new window.QRCode(qrContainer, {
      text: qrUrl.toString(),
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
            <button type="button" class="btn-icon edit" title="Edit Kendaraan" aria-label="Edit ${this.escape(item.no_polisi)}" data-kendaraan-action="edit" data-id="${this.escape(item.id)}">${this.actionIcon('edit')}</button>
            <button type="button" class="btn-icon delete" title="Hapus Kendaraan" aria-label="Hapus ${this.escape(item.no_polisi)}" data-kendaraan-action="delete" data-id="${this.escape(item.id)}">${this.actionIcon('delete')}</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openKendaraanModal(kendaraan = null) {
    if (!this.requireAdmin()) return;
    const form = document.getElementById('form-kendaraan');
    form.reset();
    this.populateKendaraanPemegangDropdown(kendaraan ? kendaraan.pemegang : '');
    document.getElementById('modal-kendaraan-title').textContent = kendaraan
      ? 'Edit Kendaraan'
      : 'Tambah Kendaraan';
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
    if (!this.requireAdmin()) return;
    const id = document.getElementById('kendaraan-id').value;
    const payload = {
      no_polisi: document.getElementById('kendaraan-no-polisi').value.trim().toUpperCase(),
      jenis: document.getElementById('kendaraan-jenis').value,
      merk_tipe: document.getElementById('kendaraan-merk-tipe').value.trim(),
      tahun: Number(document.getElementById('kendaraan-tahun').value),
      pemegang: document.getElementById('kendaraan-pemegang').value,
      jatuh_tempo_stnk: document.getElementById('kendaraan-jatuh-tempo').value,
      kondisi: document.getElementById('kendaraan-kondisi').value,
      updatedAt: serverTimestamp()
    };

    try {
      if (id) await updateDoc(doc(db, 'kendaraan', id), payload);
      else await addDoc(collection(db, 'kendaraan'), payload);
      await this.logActivity(id ? 'Edit' : 'Tambah', 'kendaraan', `${payload.no_polisi} - ${payload.merk_tipe}`);
      this.closeModal('modal-kendaraan');
      this.showToast(id ? 'Data kendaraan berhasil diperbarui.' : 'Data kendaraan berhasil disimpan.');
    } catch (err) {
      this.showToast('Gagal menyimpan data kendaraan: ' + getUserFacingError(err), 'error');
    }
  },

  editKendaraan(id) {
    const item = State.kendaraan.find(kendaraan => kendaraan.id === id);
    if (item) this.openKendaraanModal(item);
  },

  async deleteKendaraan(id) {
    if (!this.requireAdmin()) return;
    const item = State.kendaraan.find(kendaraan => kendaraan.id === id);
    if (!item) {
      this.showToast('Data kendaraan tidak ditemukan. Muat ulang daftar sebelum mencoba lagi.', 'warning');
      return;
    }
    if (!confirm(`Yakin ingin menghapus kendaraan [${item.no_polisi}]?`)) return;
    try {
      await deleteDoc(doc(db, 'kendaraan', id));
      await this.logActivity('Hapus', 'kendaraan', `${item.no_polisi} - ${item.merk_tipe}`);
      this.showToast('Data kendaraan berhasil dihapus.');
    } catch (err) {
      this.showToast('Gagal menghapus data kendaraan: ' + getUserFacingError(err), 'error');
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
            <button type="button" class="btn-icon edit" title="Edit Kehadiran" aria-label="Edit catatan ${this.escape(item.nama_karyawan)}" data-kehadiran-action="edit" data-id="${this.escape(item.id)}">${this.actionIcon('edit')}</button>
            <button type="button" class="btn-icon delete" title="Hapus Kehadiran" aria-label="Hapus catatan ${this.escape(item.nama_karyawan)}" data-kehadiran-action="delete" data-id="${this.escape(item.id)}">${this.actionIcon('delete')}</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openKehadiranModal(kehadiran = null) {
    if (!this.requireAdmin()) return;
    const form = document.getElementById('form-kehadiran');
    form.reset();
    this.populateKehadiranKaryawanDropdown(
      kehadiran ? kehadiran.karyawan_id : '',
      kehadiran ? kehadiran.nama_karyawan : '',
      kehadiran ? kehadiran.nik_karyawan : ''
    );
    document.getElementById('modal-kehadiran-title').textContent = kehadiran
      ? 'Edit Kehadiran'
      : 'Catat Kehadiran';
    document.getElementById('kehadiran-id').value = kehadiran ? kehadiran.id : '';
    document.getElementById('kehadiran-tanggal').value = kehadiran ? kehadiran.tanggal || '' : this.getTodayDate();
    document.getElementById('kehadiran-status').value = kehadiran ? kehadiran.status || 'Hadir' : 'Hadir';
    document.getElementById('kehadiran-jam-masuk').value = kehadiran ? kehadiran.jam_masuk || '' : '';
    document.getElementById('kehadiran-keterangan').value = kehadiran ? kehadiran.keterangan || '' : '';
    this.openModal('modal-kehadiran');
  },

  async saveKehadiran(e) {
    e.preventDefault();
    if (!this.requireAdmin()) return;
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
      keterangan: document.getElementById('kehadiran-keterangan').value.trim(),
      updatedAt: serverTimestamp()
    };

    try {
      if (id) await updateDoc(doc(db, 'kehadiran', id), payload);
      else await addDoc(collection(db, 'kehadiran'), payload);
      await this.logActivity(
        id ? 'Edit' : 'Tambah',
        'kehadiran',
        `${payload.nama_karyawan} (${payload.tanggal})`
      );
      this.closeModal('modal-kehadiran');
      this.showToast(id ? 'Data kehadiran berhasil diperbarui.' : 'Data kehadiran berhasil disimpan.');
    } catch (err) {
      this.showToast('Gagal menyimpan data kehadiran: ' + getUserFacingError(err), 'error');
    }
  },

  editKehadiran(id) {
    const item = State.kehadiran.find(kehadiran => kehadiran.id === id);
    if (item) this.openKehadiranModal(item);
  },

  async deleteKehadiran(id) {
    if (!this.requireAdmin()) return;
    const item = State.kehadiran.find(kehadiran => kehadiran.id === id);
    if (!item) {
      this.showToast('Catatan kehadiran tidak ditemukan. Muat ulang daftar sebelum mencoba lagi.', 'warning');
      return;
    }
    if (!confirm(`Yakin ingin menghapus catatan kehadiran ${item.nama_karyawan} tanggal ${item.tanggal}?`)) return;
    try {
      await deleteDoc(doc(db, 'kehadiran', id));
      await this.logActivity('Hapus', 'kehadiran', `${item.nama_karyawan} (${item.tanggal})`);
      this.showToast('Data kehadiran berhasil dihapus.');
    } catch (err) {
      this.showToast('Gagal menghapus data kehadiran: ' + getUserFacingError(err), 'error');
    }
  },

  // --- LAPORAN AUDIT & REKAPITULASI ---
  renderAuditReport() {
    const { hardware, network } = State;
    const tbody = document.getElementById('table-audit-body');
    const allAssets = [];
    const printDate = new Date();
    this.updateReportSignatureNames();
    document.getElementById('print-date').textContent =
      `Tanggal cetak: ${printDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`;

    hardware.forEach(h => {
      allAssets.push({
        kode: h.kode,
        kelompok: 'Master Barang',
        nama: `${this.getHardwareCategory(h)} - ${h.merek}`,
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
    } else {
      tbody.innerHTML = allAssets.map((item, index) => `
        <tr>
          <td class="row-num">${index + 1}</td>
          <td><span class="asset-tag">${this.escape(item.kode)}</span></td>
          <td><span class="badge ${item.kelompok === 'Master Barang' ? 'badge-info' : 'badge-gender male'}">${item.kelompok}</span></td>
          <td><strong>${this.escape(item.nama)}</strong></td>
          <td><span class="serial-num">${this.escape(item.sn)}</span></td>
          <td style="font-size: 0.78rem;">${this.escape(item.koneksi)}</td>
          <td>${this.escape(item.pj)}</td>
          <td>${this.getStatusBadge(item.status)}</td>
        </tr>
      `).join('');
    }

    const employeeTbody = document.getElementById('table-audit-karyawan-body');
    if (State.karyawan.length === 0) {
      employeeTbody.innerHTML = '<tr><td colspan="10" class="text-center" style="padding: 24px; color: var(--text-muted);">Belum ada data karyawan.</td></tr>';
      return;
    }

    employeeTbody.innerHTML = State.karyawan.map((karyawan, index) => `
      <tr>
        <td class="row-num">${index + 1}</td>
        <td><span class="asset-tag">${this.escape(karyawan.nik || '-')}</span></td>
        <td><strong>${this.escape(karyawan.nama || '-')}</strong></td>
        <td>${this.escape(karyawan.jabatan || '-')}</td>
        <td>${this.escape(this.getKaryawanDepartemen(karyawan))}</td>
        <td>${this.getKaryawanStatusBadge(karyawan.status_karyawan)}</td>
        <td class="employee-tenure-cell">${this.renderKaryawanTenure(karyawan)}</td>
        <td>${this.escape(karyawan.lokasi || '-')}</td>
        <td>${this.getKaryawanInventoryBadge(karyawan.statusInventaris)}</td>
        <td class="employee-inventory-notes">${this.escape(karyawan.keteranganInventaris || '-')}</td>
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
    let text = String(value == null ? '' : value);
    // Cegah formula injection di Excel/Sheets; "-" tunggal (placeholder) dibiarkan.
    if (text !== '-' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  },

  exportKaryawanCSV() {
    let csv = 'No,NIK/NIP,Nama Karyawan,Jabatan,Departemen/Bagian,Status Karyawan (Entitas/Asal),Masa Jabatan,Tanggal Mulai Menjabat,Akhir Masa Jabatan / Estimasi Pensiun,Status Kepegawaian,Lokasi,Status Inventaris IT,Penjelasan Inventaris IT\n';
    State.karyawan.forEach((k, idx) => {
      csv += [
        idx + 1, k.nik, k.nama, k.jabatan, this.getKaryawanDepartemen(k),
        this.getKaryawanStatus(k.status_karyawan), this.getKaryawanTenureExportValue(k),
        k.tanggal_mulai, k.akhir_jabatan,
        this.getEmploymentStatusLabel(k.status_jabatan), k.lokasi, k.statusInventaris, k.keteranganInventaris
      ]
        .map(value => this.csvCell(value)).join(',') + '\n';
    });
    this.downloadCSV('Data_Karyawan_Agrinas.csv', csv);
  },

  exportHardwareCSV() {
    let csv = 'Kode Aset,Jenis Perangkat,Merek & Tipe,Serial Number,MAC Address,Pemegang,Kondisi,Tahun Perolehan,Prosesor,RAM,Penyimpanan (HDD / SSD),Keterangan Teknis\n';
    State.hardware.forEach(h => {
      csv += [
        h.kode, this.getHardwareCategory(h), h.merek, h.sn, h.mac || '-',
        h.pemegang, h.status, h.tahun || h.tahun_perolehan || '-',
        h.prosesor, h.ram, h.penyimpanan, h.keterangan_teknis
      ].map(value => this.csvCell(value)).join(',') + '\n';
    });
    this.downloadCSV('Inventaris_Hardware_Agrinas.csv', csv);
  },

  exportNetworkCSV() {
    let csv = 'Kode Aset,Nama Perangkat,Kategori,IP Address,MAC Address,Lokasi Penempatan,Status\n';
    State.network.forEach(n => {
      csv += [n.kode, n.nama, n.kategori, n.ip || '-', n.mac || '-', n.lokasi, n.status]
        .map(value => this.csvCell(value)).join(',') + '\n';
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
      csv += [
        h.kode, 'Master Barang', `${this.getHardwareCategory(h)} - ${h.merek}`,
        h.sn, '-', h.mac || '-', h.pemegang, h.status
      ].map(value => this.csvCell(value)).join(',') + '\n';
    });
    State.network.forEach(n => {
      csv += [
        n.kode, 'Network & Server', `${n.kategori} - ${n.nama}`,
        '-', n.ip || '-', n.mac || '-', n.lokasi, n.status
      ].map(value => this.csvCell(value)).join(',') + '\n';
    });
    csv += '\n\nData Karyawan & Inventaris IT\n';
    csv += 'No,NIK/NIP,Nama Karyawan,Jabatan,Departemen/Bagian,Status Karyawan (Entitas/Asal),Masa Jabatan,Tanggal Mulai Menjabat,Akhir Masa Jabatan / Estimasi Pensiun,Status Kepegawaian,Lokasi,Status Inventaris IT,Penjelasan Inventaris IT\n';
    State.karyawan.forEach((karyawan, index) => {
      csv += [
        index + 1, karyawan.nik, karyawan.nama, karyawan.jabatan, this.getKaryawanDepartemen(karyawan),
        this.getKaryawanStatus(karyawan.status_karyawan), this.getKaryawanTenureExportValue(karyawan),
        karyawan.tanggal_mulai, karyawan.akhir_jabatan,
        this.getEmploymentStatusLabel(karyawan.status_jabatan), karyawan.lokasi,
        karyawan.statusInventaris, karyawan.keteranganInventaris
      ].map(value => this.csvCell(value)).join(',') + '\n';
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
      if (newPass && newPass.length < 6) {
        this.showToast('Kata sandi baru minimal 6 karakter.', 'warning');
        return;
      }

      await updateProfile(State.user, { displayName: newName });
      if (newPass) {
        await updatePassword(State.user, newPass);
      }
      this.updateProfileUI(State.user);
      this.showToast('Profil akun berhasil diperbarui.');
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        this.showToast('Demi keamanan, silakan keluar lalu masuk kembali sebelum mengganti kata sandi.', 'warning');
      } else {
        this.showToast('Gagal memperbarui profil: ' + getUserFacingError(err), 'error');
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
    link.download = `Cadangan_Inventaris_Agrinas_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  restoreDatabase() {
    if (!this.requireAdmin()) return;
    const fileInput = document.getElementById('input-restore-file');
    if (!fileInput.files || fileInput.files.length === 0) {
      this.showToast('Pilih file cadangan berformat JSON terlebih dahulu.', 'warning');
      return;
    }

    const file = fileInput.files[0];
    if (!confirm(`Impor data dari file "${file.name}"?\n\nData dengan NIK / kode aset / nomor polisi yang sudah ada akan dilewati (tidak ditimpa). Lanjutkan?`)) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      let importedCount = 0;
      let skippedCount = 0;
      try {
        const data = JSON.parse(e.target.result);
        if (!this.requireAdmin()) return;
        const collectionNames = ['karyawan', 'hardware', 'network', 'kendaraan', 'kehadiran'];
        if (!data || typeof data !== 'object' || Array.isArray(data) ||
            !collectionNames.some(name => Array.isArray(data[name]))) {
          throw new Error('Struktur file cadangan tidak valid.');
        }

        const norm = value => String(value == null ? '' : value).trim().toLowerCase();
        const assetCodes = new Set([...State.hardware, ...State.network].map(i => norm(i.kode)).filter(Boolean));
        const seenKeys = {
          karyawan: new Set(State.karyawan.map(i => norm(i.nik)).filter(Boolean)),
          hardware: assetCodes,
          network: assetCodes,
          kendaraan: new Set(State.kendaraan.map(i => norm(i.no_polisi)).filter(Boolean)),
          kehadiran: new Set(State.kehadiran.map(i => `${norm(i.tanggal)}|${norm(i.nik_karyawan)}`))
        };
        const keyOf = (name, item) => {
          if (name === 'karyawan') return norm(item.nik);
          if (name === 'hardware' || name === 'network') return norm(item.kode);
          if (name === 'kendaraan') return norm(item.no_polisi);
          return `${norm(item.tanggal)}|${norm(item.nik_karyawan)}`;
        };

        for (const collectionName of collectionNames) {
          if (!Array.isArray(data[collectionName])) continue;
          for (const item of data[collectionName]) {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
              throw new Error('File cadangan berisi data yang tidak valid.');
            }
            const key = keyOf(collectionName, item);
            if (key && key !== '|' && seenKeys[collectionName].has(key)) {
              skippedCount += 1;
              continue;
            }
            if (key && key !== '|') seenKeys[collectionName].add(key);
            const record = { ...item };
            delete record.id;
            await addDoc(collection(db, collectionName), {
              ...record,
              updatedAt: serverTimestamp()
            });
            importedCount += 1;
          }
        }

        fileInput.value = '';
        if (importedCount === 0) {
          if (skippedCount > 0) {
            this.showToast(`Tidak ada data baru. ${skippedCount} data dilewati karena sudah ada.`, 'warning');
            return;
          }
          throw new Error('File cadangan tidak berisi data untuk dipulihkan.');
        }
        await this.logActivity('Impor', 'data', `${importedCount} data dipulihkan`);
        this.showToast(`${importedCount} data berhasil diimpor${skippedCount ? `, ${skippedCount} data duplikat dilewati` : ''}.`);
      } catch (err) {
        fileInput.value = '';
        const partialImport = importedCount
          ? ` ${importedCount} data sempat diimpor sebelum proses terhenti.`
          : '';
        this.showToast('Gagal mengimpor data: ' + getUserFacingError(err) + partialImport, 'error');
      }
    };
    reader.onerror = () => {
      fileInput.value = '';
      this.showToast('File cadangan gagal dibaca.', 'error');
    };
    reader.readAsText(file);
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
      [
        item.nama, item.nik, item.jabatan, item.departemen, item.divisi, item.lokasi, item.status_karyawan,
        item.statusInventaris, item.keteranganInventaris,
        item.tanggal_mulai, item.akhir_jabatan, item.status_jabatan
      ].some(value => String(value || '').toLowerCase().includes(k))
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
      html += `<div class="search-result-group"><span>Master Barang (${results.hardware.length})</span></div>`;
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
      html += `<div class="search-result-group"><span>Master Karyawan (${results.karyawan.length})</span></div>`;
      results.karyawan.slice(0, 4).forEach(k => {
        html += `
          <div class="search-result-item" onclick="app.selectSearchResult('karyawan')">
            <div class="item-main">
              <div class="item-title">${this.escape(k.nama)} &bull; <small style="color:var(--text-muted)">${this.escape(k.nik)}</small></div>
              <div class="item-sub">${this.escape(k.jabatan)} &bull; ${this.escape(this.getKaryawanDepartemen(k))} &bull; ${this.escape(k.lokasi || '-')} &bull; ${this.escape(this.getKaryawanStatus(k.status_karyawan))}</div>
            </div>
            <span class="btn btn-outline btn-sm">Lihat</span>
          </div>
        `;
      });
    }

    if (results.network.length > 0) {
      html += `<div class="search-result-group"><span>Network &amp; Server (${results.network.length})</span></div>`;
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
      html += `<div class="search-result-group"><span>Kendaraan Operasional (${results.kendaraan.length})</span></div>`;
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
      html += `<div class="search-result-group"><span>Data Kehadiran (${results.kehadiran.length})</span></div>`;
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
    this.navigateTo(viewId, { keepSearch: true });
  },

  // --- HELPERS ---
  loadAuditSignatureSettings() {
    const adminInput = document.getElementById('audit-signature-admin');
    const managerInput = document.getElementById('audit-signature-manager');
    try {
      adminInput.value = localStorage.getItem(AUDIT_SIGNATURE_ADMIN_KEY) || 'Dhimas Rizky Arrasy';
      managerInput.value = localStorage.getItem(AUDIT_SIGNATURE_MANAGER_KEY) || '';
    } catch (error) {
      console.error('Gagal membaca nama penanda tangan dari localStorage:', error);
      adminInput.value = 'Dhimas Rizky Arrasy';
      managerInput.value = '';
    }
    this.updateReportSignatureNames();
  },

  normalizeItSupportPhone(value) {
    const raw = String(value || '').trim();
    if (!raw || raw.toUpperCase() === DEFAULT_IT_SUPPORT_PHONE) {
      return DEFAULT_IT_SUPPORT_PHONE;
    }

    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
    else if (digits.startsWith('8')) digits = `62${digits}`;
    return digits || DEFAULT_IT_SUPPORT_PHONE;
  },

  applyItSupportPhone(value) {
    State.itSupportPhone = this.normalizeItSupportPhone(value);
    const input = document.getElementById('it-support-phone');
    if (input && document.activeElement !== input) {
      input.value = State.itSupportPhone;
    }
    this.updatePublicQrReportLink();
  },

  setItSupportSettingsStatus(message, isError = false) {
    const status = document.getElementById('it-support-settings-status');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('error', isError);
  },

  async saveItSupportSettings(e) {
    e.preventDefault();
    if (!this.requireAdmin()) return;

    const input = document.getElementById('it-support-phone');
    const phone = this.normalizeItSupportPhone(input.value);
    if (phone !== DEFAULT_IT_SUPPORT_PHONE && !/^62\d{8,13}$/.test(phone)) {
      this.setItSupportSettingsStatus('Masukkan nomor WhatsApp valid dengan kode negara, contoh 6282138098917.', true);
      input.focus();
      return;
    }

    try {
      await setDoc(doc(db, 'settings', 'it_support'), {
        whatsappNumber: phone,
        updatedAt: serverTimestamp()
      }, { merge: true });
      input.value = phone;
      this.applyItSupportPhone(phone);
      this.setItSupportSettingsStatus('Nomor WhatsApp IT Support berhasil disimpan.');
      this.showToast('Nomor WhatsApp IT Support berhasil diperbarui.');
    } catch (error) {
      console.error('Gagal menyimpan nomor WhatsApp IT Support:', error);
      this.setItSupportSettingsStatus(`Gagal menyimpan nomor WhatsApp: ${getUserFacingError(error)}`, true);
      this.showToast('Gagal menyimpan nomor WhatsApp IT Support: ' + getUserFacingError(error), 'error');
    }
  },

  saveAuditSignatures(e) {
    e.preventDefault();
    const adminName = document.getElementById('audit-signature-admin').value.trim();
    const managerName = document.getElementById('audit-signature-manager').value.trim();
    if (!adminName || !managerName) {
      this.showToast('Nama pembuat laporan dan nama mentor wajib diisi.', 'warning');
      return;
    }

    try {
      localStorage.setItem(AUDIT_SIGNATURE_ADMIN_KEY, adminName);
      localStorage.setItem(AUDIT_SIGNATURE_MANAGER_KEY, managerName);
      this.updateReportSignatureNames();
      this.showToast('Nama penanda tangan laporan audit berhasil disimpan.');
    } catch (error) {
      console.error('Gagal menyimpan nama penanda tangan laporan:', error);
      this.showToast('Nama penanda tangan tidak dapat disimpan di browser ini.', 'error');
    }
  },

  updateReportSignatureNames() {
    const adminInput = document.getElementById('audit-signature-admin');
    const managerInput = document.getElementById('audit-signature-manager');
    const adminName = adminInput && adminInput.value.trim()
      ? adminInput.value.trim()
      : 'Dhimas Rizky Arrasy';
    const managerName = managerInput ? managerInput.value.trim() : '';
    document.getElementById('sign-admin-name').textContent = adminName;
    document.getElementById('sign-manager-name').textContent = managerName;
  },

  async logActivity(action, collectionName, itemName) {
    if (!this.isAdmin()) return;
    try {
      await addDoc(collection(db, 'activity_logs'), {
        timestamp: Date.now(),
        actor: State.user.email || ADMIN_EMAIL,
        action,
        collection: collectionName,
        item: itemName
      });
    } catch (error) {
      console.error('Gagal menyimpan log aktivitas:', error);
    }
  },

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

  toTimestampDate(value) {
    if (value == null || value === '') return null;
    const date = value && typeof value.toDate === 'function'
      ? value.toDate()
      : value instanceof Date
        ? value
        : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  },

  renderDataUpdateStamp() {
    const element = document.querySelector('.data-update-stamp');
    if (!element) return;

    const records = [
      ...State.karyawan,
      ...State.hardware,
      ...State.network,
      ...State.kendaraan,
      ...State.kehadiran
    ];
    const dates = records
      .map(record => this.toTimestampDate(record.updatedAt))
      .filter(Boolean);
    dates.push(...State.activityLogs
      .map(log => this.toTimestampDate(log.timestamp))
      .filter(Boolean));

    if (dates.length === 0) {
      element.textContent = 'Pembaruan data terakhir: Belum ada catatan.';
      delete element.dataset.updatedAt;
      return;
    }

    const latest = new Date(Math.max(...dates.map(date => date.getTime())));
    element.textContent = `Pembaruan data terakhir: ${latest.toLocaleString('id-ID', {
      dateStyle: 'long',
      timeStyle: 'short'
    })}`;
    element.dataset.updatedAt = latest.toISOString();
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
    const status = this.getEmploymentStatusLabel(karyawan.status_jabatan);
    if (!karyawan.akhir_jabatan) {
      if (status === 'Karyawan Tetap') return 'Tetap (Belum diatur tanggal pensiun)';
      if (status === 'Pensiun') return 'Tanggal pensiun belum diatur';
      return 'Tanggal akhir masa kerja belum diatur';
    }

    const today = new Date(`${this.getTodayDate()}T00:00:00`);
    const endDate = new Date(`${karyawan.akhir_jabatan}T00:00:00`);
    if (Number.isNaN(endDate.getTime())) return 'Tanggal akhir tidak valid';
    const daysRemaining = Math.round((endDate.getTime() - today.getTime()) / 86400000);
    const endDateLabel = this.formatDate(karyawan.akhir_jabatan);
    if (daysRemaining < 0) {
      const endedLabel = status === 'Pensiun' ? `Pensiun sejak ${endDateLabel}` : `Masa kerja berakhir ${endDateLabel}`;
      return `${endedLabel} (${Math.abs(daysRemaining)} hari lalu)`;
    }
    if (daysRemaining === 0) return 'Berakhir hari ini';

    const sixMonthsLater = new Date(today);
    sixMonthsLater.setDate(1);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    const lastDayOfMonth = new Date(
      sixMonthsLater.getFullYear(),
      sixMonthsLater.getMonth() + 1,
      0
    ).getDate();
    sixMonthsLater.setDate(Math.min(today.getDate(), lastDayOfMonth));

    const warning = endDate < sixMonthsLater ? ' • Peringatan: sisa waktu kurang dari 6 bulan' : '';
    return `Sisa masa kerja ${daysRemaining} hari${warning}`;
  },

  getEmploymentStatusLabel(status) {
    if (status === 'Kontrak (PKWT)') return 'Karyawan Kontrak (PKWT)';
    if (status === 'Selesai / Pensiun') return 'Pensiun';
    return status || 'Karyawan Tetap';
  },

  getEmploymentBadge(status) {
    const value = this.getEmploymentStatusLabel(status);
    let style = 'badge-success';
    if (value === 'Karyawan Kontrak (PKWT)' || value === 'Mendekati Pensiun' || value === 'Masa Percobaan') {
      style = 'badge-warning';
    }
    if (value === 'Pensiun') style = 'badge-danger';
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

  actionIcon(name) {
    const shapes = {
      edit: '<path d="m14 5 5 5M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"></path>',
      delete: '<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"></path>',
      eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle>',
      qr: '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><path d="M14 14h3v3h-3zM20 14v2M14 20h2M20 19v2"></path>',
      chevron: '<path d="m6 9 6 6 6-6"></path>'
    };
    return `<svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${shapes[name]}</svg>`;
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

    document.getElementById('btn-toggle-password').addEventListener('click', (e) => {
      const button = e.currentTarget;
      const password = document.getElementById('login-password');
      const isVisible = password.type === 'password';
      password.type = isVisible ? 'text' : 'password';
      button.classList.toggle('password-visible', isVisible);
      button.setAttribute('aria-pressed', String(isVisible));
      button.setAttribute('aria-label', isVisible ? 'Sembunyikan password' : 'Tampilkan password');
    });

    document.getElementById('form-admin-access').addEventListener('submit', (e) => this.addAdminEmail(e));
    document.getElementById('admin-email-list').addEventListener('click', (e) => {
      const removeButton = e.target.closest('[data-remove-admin]');
      if (removeButton) this.removeAdminEmail(removeButton.dataset.removeAdmin);
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
    document.getElementById('btn-close-public-qr').addEventListener('click', () => this.closePublicQr());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !document.getElementById('public-qr-overlay').hidden) {
        this.closePublicQr();
      }
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
      if (results.hardware.length > 0) this.navigateTo('hardware', { keepSearch: true });
      else if (results.karyawan.length > 0) this.navigateTo('karyawan', { keepSearch: true });
      else if (results.network.length > 0) this.navigateTo('network', { keepSearch: true });
      else if (results.kendaraan.length > 0) this.navigateTo('kendaraan', { keepSearch: true });
      else if (results.kehadiran.length > 0) {
        this.attendanceDateFilter = '';
        dateFilter.value = '';
        this.navigateTo('kehadiran', { keepSearch: true });
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
    document.getElementById('inventory-search-input').addEventListener('input', (e) => {
      this.inventorySearchQuery = e.target.value;
      this.renderDataInventarisTable();
    });
    document.getElementById('inventory-category-filter').addEventListener('change', (e) => {
      this.inventoryCategoryFilter = e.target.value;
      this.renderDataInventarisTable();
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

    document.getElementById('table-hardware-body').addEventListener('click', (e) => {
      const button = e.target.closest('[data-hardware-action]');
      if (!button) return;
      const { id } = button.dataset;
      const action = button.dataset.hardwareAction;
      if (action === 'toggle') {
        if (this.expandedHardwareIds.has(id)) this.expandedHardwareIds.delete(id);
        else this.expandedHardwareIds.add(id);
        this.renderHardwareTable();
        return;
      }
      if (action === 'edit') this.editHardware(id);
      if (action === 'delete') {
        const item = State.hardware.find(hardware => hardware.id === id);
        if (item) this.deleteHardware(id, item.kode);
      }
      if (action === 'qr') this.openAssetQr('hardware', id);
    });

    document.getElementById('table-network-body').addEventListener('click', (e) => {
      const button = e.target.closest('[data-network-action]');
      if (!button) return;
      const { id } = button.dataset;
      const action = button.dataset.networkAction;
      if (action === 'edit') this.editNetwork(id);
      if (action === 'delete') {
        const item = State.network.find(network => network.id === id);
        if (item) this.deleteNetwork(id, item.kode);
      }
      if (action === 'qr') this.openAssetQr('network', id);
    });

    document.getElementById('table-kendaraan-body').addEventListener('click', (e) => {
      const button = e.target.closest('[data-kendaraan-action]');
      if (!button) return;
      const { id } = button.dataset;
      const action = button.dataset.kendaraanAction;
      if (action === 'edit') this.editKendaraan(id);
      if (action === 'delete') this.deleteKendaraan(id);
    });

    document.getElementById('table-kehadiran-body').addEventListener('click', (e) => {
      const button = e.target.closest('[data-kehadiran-action]');
      if (!button) return;
      const { id } = button.dataset;
      const action = button.dataset.kehadiranAction;
      if (action === 'edit') this.editKehadiran(id);
      if (action === 'delete') this.deleteKehadiran(id);
    });

    document.getElementById('table-inventaris-body').addEventListener('click', (e) => {
      const button = e.target.closest('[data-inventory-action="view"]');
      if (button) this.openInventoryDetail(button.dataset.id);
    });

    document.getElementById('table-karyawan-body').addEventListener('click', (e) => {
      const button = e.target.closest('[data-karyawan-action]');
      if (!button) return;
      const { id } = button.dataset;
      const action = button.dataset.karyawanAction;
      if (action === 'toggle') {
        this.toggleKaryawanRow(id);
        return;
      }
      if (action === 'detail') this.showKaryawanDetail(id);
      if (action === 'edit') this.editKaryawan(id);
      if (action === 'delete') this.deleteKaryawan(id);
    });

    document.getElementById('karyawan-nama').addEventListener('input', () => this.updateKaryawanInventorySuggestion());
    document.getElementById('karyawan-status-inventaris').addEventListener('change', () => this.updateKaryawanInventorySuggestion());
    document.getElementById('btn-use-karyawan-inventory-suggestion').addEventListener('click', () => {
      const suggestion = document.getElementById('karyawan-inventory-suggestion').dataset.suggestion;
      if (suggestion) document.getElementById('karyawan-keterangan-inventaris').value = suggestion;
    });

    document.getElementById('form-karyawan').addEventListener('submit', (e) => this.saveKaryawan(e));
    document.getElementById('form-hardware').addEventListener('submit', (e) => this.saveHardware(e));
    document.getElementById('form-network').addEventListener('submit', (e) => this.saveNetwork(e));
    document.getElementById('form-kendaraan').addEventListener('submit', (e) => this.saveKendaraan(e));
    document.getElementById('form-kehadiran').addEventListener('submit', (e) => this.saveKehadiran(e));
    document.getElementById('form-update-profile').addEventListener('submit', (e) => this.saveProfile(e));
    document.getElementById('form-audit-signatures').addEventListener('submit', (e) => this.saveAuditSignatures(e));
    document.getElementById('form-it-support-settings').addEventListener('submit', (e) => this.saveItSupportSettings(e));
    document.getElementById('btn-print-qr').addEventListener('click', () => this.printQrLabel());
    document.getElementById('btn-inventory-detail-qr').addEventListener('click', () => {
      const assetId = document.getElementById('btn-inventory-detail-qr').dataset.assetId;
      if (!assetId) {
        this.showToast('Pilih aset terlebih dahulu untuk menampilkan QR Code.', 'warning');
        return;
      }
      this.openAssetQr('hardware', assetId);
    });

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