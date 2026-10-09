export const PERMISSIONS = [
  // =====================================================
  // DASHBOARD
  // =====================================================

  {
    key: 'dashboard.read',
    name: 'Lihat Dashboard',
    description: 'Melihat dashboard sistem.',
    module: 'dashboard',
    action: 'read',
  },

  // =====================================================
  // EMPLOYEES
  // =====================================================

  {
    key: 'employees.read',
    name: 'Lihat Karyawan',
    description: 'Melihat data karyawan.',
    module: 'employees',
    action: 'read',
  },

  {
    key: 'employees.create',
    name: 'Tambah Karyawan',
    description: 'Menambahkan data karyawan baru.',
    module: 'employees',
    action: 'create',
  },

  {
    key: 'employees.update',
    name: 'Edit Karyawan',
    description: 'Mengubah data karyawan.',
    module: 'employees',
    action: 'update',
  },

  {
    key: 'employees.delete',
    name: 'Hapus Karyawan',
    description: 'Menghapus data karyawan.',
    module: 'employees',
    action: 'delete',
  },

  // =====================================================
  // LEAVE
  // =====================================================

  {
    key: 'leave.read',
    name: 'Lihat Cuti',
    description: 'Melihat data dan riwayat pengajuan cuti.',
    module: 'leave',
    action: 'read',
  },

  {
    key: 'leave.create',
    name: 'Buat Cuti',
    description: 'Membuat pengajuan cuti.',
    module: 'leave',
    action: 'create',
  },

  {
    key: 'leave.update',
    name: 'Edit Cuti',
    description: 'Mengubah pengajuan cuti.',
    module: 'leave',
    action: 'update',
  },

  {
    key: 'leave.delete',
    name: 'Hapus Cuti',
    description: 'Menghapus pengajuan cuti.',
    module: 'leave',
    action: 'delete',
  },

  // =====================================================
  // LEAVE APPROVAL
  // =====================================================

  {
    key: 'leave.approve_management',
    name: 'Approval Management',
    description: 'Menyetujui atau menolak pengajuan pada tahap Management.',
    module: 'leave',
    action: 'approve_management',
  },

  {
    key: 'leave.approve_owner',
    name: 'Approval Owner',
    description: 'Menyetujui atau menolak pengajuan pada tahap Owner.',
    module: 'leave',
    action: 'approve_owner',
  },

  {
    key: 'leave.approve_exception',
    name: 'Approval Exception',
    description: 'Menyetujui atau menolak pengecualian pengajuan cuti.',
    module: 'leave',
    action: 'approve_exception',
  },

  // =====================================================
  // USERS
  // =====================================================

  {
    key: 'users.read',
    name: 'Lihat Pengguna',
    description: 'Melihat data pengguna sistem.',
    module: 'users',
    action: 'read',
  },

  {
    key: 'users.create',
    name: 'Tambah Pengguna',
    description: 'Membuat akun pengguna baru.',
    module: 'users',
    action: 'create',
  },

  {
    key: 'users.update',
    name: 'Edit Pengguna',
    description: 'Mengubah data pengguna.',
    module: 'users',
    action: 'update',
  },

  {
    key: 'users.delete',
    name: 'Hapus Pengguna',
    description: 'Menghapus pengguna dari sistem.',
    module: 'users',
    action: 'delete',
  },

  {
    key: 'users.manage_permissions',
    name: 'Kelola Hak Akses',
    description: 'Mengatur role dan permission pengguna.',
    module: 'users',
    action: 'manage_permissions',
  },

  {
  key: 'roles.read',
  name: 'Lihat Role',
  description: 'Melihat daftar dan detail role perusahaan.',
  module: 'roles',
  action: 'read',
},

{
  key: 'roles.create',
  name: 'Tambah Role',
  description: 'Membuat role perusahaan baru.',
  module: 'roles',
  action: 'create',
},

{
  key: 'roles.update',
  name: 'Edit Role',
  description: 'Mengubah role perusahaan.',
  module: 'roles',
  action: 'update',
},

{
  key: 'roles.delete',
  name: 'Hapus Role',
  description: 'Menghapus role perusahaan.',
  module: 'roles',
  action: 'delete',
},

{
  key: 'roles.manage_permissions',
  name: 'Kelola Permission Role',
  description: 'Mengatur permission yang dimiliki sebuah role.',
  module: 'roles',
  action: 'manage_permissions',
},

  // =====================================================
  // HOLIDAYS
  // =====================================================

  {
    key: 'holidays.read',
    name: 'Lihat Hari Libur',
    description: 'Melihat daftar hari libur perusahaan.',
    module: 'holidays',
    action: 'read',
  },

  {
    key: 'holidays.create',
    name: 'Tambah Hari Libur',
    description: 'Menambahkan hari libur perusahaan.',
    module: 'holidays',
    action: 'create',
  },

  {
    key: 'holidays.update',
    name: 'Edit Hari Libur',
    description: 'Mengubah data hari libur perusahaan.',
    module: 'holidays',
    action: 'update',
  },

  {
    key: 'holidays.delete',
    name: 'Hapus Hari Libur',
    description: 'Menghapus hari libur perusahaan.',
    module: 'holidays',
    action: 'delete',
  },

  // =====================================================
  // SETTINGS
  // =====================================================

  {
    key: 'settings.read',
    name: 'Lihat Pengaturan',
    description: 'Melihat konfigurasi sistem.',
    module: 'settings',
    action: 'read',
  },

  {
    key: 'settings.update',
    name: 'Edit Pengaturan',
    description: 'Mengubah konfigurasi sistem.',
    module: 'settings',
    action: 'update',
  },
] as const

// =====================================================
// PLATFORM PERMISSIONS
// =====================================================

export const PLATFORM_PERMISSIONS = [
  // =====================================================
  // PLATFORM DASHBOARD
  // =====================================================

  {
    key: 'platform.dashboard.read',
    name: 'Lihat Platform Dashboard',
    description: 'Melihat dashboard utama platform.',
    module: 'platform',
    action: 'read',
  },

  // =====================================================
  // PLATFORM COMPANIES
  // =====================================================

  {
    key: 'platform.companies.read',
    name: 'Lihat Perusahaan',
    description: 'Melihat daftar dan detail perusahaan.',
    module: 'platform.companies',
    action: 'read',
  },

  {
    key: 'platform.companies.create',
    name: 'Tambah Perusahaan',
    description: 'Membuat perusahaan baru di platform.',
    module: 'platform.companies',
    action: 'create',
  },

  {
    key: 'platform.companies.update',
    name: 'Edit Perusahaan',
    description: 'Mengubah informasi perusahaan.',
    module: 'platform.companies',
    action: 'update',
  },

  {
    key: 'platform.companies.suspend',
    name: 'Suspend Perusahaan',
    description: 'Menonaktifkan sementara akses perusahaan.',
    module: 'platform.companies',
    action: 'suspend',
  },

  {
    key: 'platform.companies.activate',
    name: 'Aktifkan Perusahaan',
    description: 'Mengaktifkan kembali akses perusahaan.',
    module: 'platform.companies',
    action: 'activate',
  },

  // =====================================================
  // PLATFORM MODULES
  // =====================================================

  {
    key: 'platform.modules.read',
    name: 'Lihat Modul Platform',
    description: 'Melihat modul yang tersedia di platform.',
    module: 'platform.modules',
    action: 'read',
  },

  {
    key: 'platform.modules.manage',
    name: 'Kelola Modul Perusahaan',
    description: 'Mengaktifkan atau menonaktifkan modul untuk perusahaan.',
    module: 'platform.modules',
    action: 'manage',
  },

  // =====================================================
  // PLATFORM USERS
  // =====================================================

  {
    key: 'platform.users.read',
    name: 'Lihat Platform Users',
    description: 'Melihat pengguna yang memiliki akses ke platform.',
    module: 'platform.users',
    action: 'read',
  },

  {
    key: 'platform.users.manage',
    name: 'Kelola Platform Users',
    description: 'Mengelola akun dan akses pengguna platform.',
    module: 'platform.users',
    action: 'manage',
  },

  // =====================================================
  // PLATFORM ROLES
  // =====================================================

  {
    key: 'platform.roles.manage',
    name: 'Kelola Platform Roles',
    description: 'Mengelola role dan permission pengguna platform.',
    module: 'platform.roles',
    action: 'manage',
  },

  // =====================================================
  // PLATFORM AUDIT
  // =====================================================

  {
    key: 'platform.audit.read',
    name: 'Lihat Platform Audit Log',
    description: 'Melihat aktivitas penting di tingkat platform.',
    module: 'platform.audit',
    action: 'read',
  },
] as const

// =====================================================
// COMPANY PERMISSION KEY
// =====================================================

export type PermissionKey =
  (typeof PERMISSIONS)[number]['key']

// =====================================================
// PLATFORM PERMISSION KEY
// =====================================================

export type PlatformPermissionKey =
  (typeof PLATFORM_PERMISSIONS)[number]['key']