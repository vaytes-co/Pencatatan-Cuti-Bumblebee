# Sistem Cuti — Frontend

Frontend static untuk GitHub Pages.

## 1. Hubungkan ke Apps Script

Buka `config.js`, lalu ganti:

```js
API_URL: 'PASTE_APPS_SCRIPT_WEB_APP_URL_HERE'
```

dengan URL Web App Apps Script kamu, contoh:

```js
API_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec'
```

## 2. Deploy

Upload folder `frontend` ke repository GitHub Pages.

Tidak membutuhkan Node/npm karena Tailwind dipakai melalui CDN.

## 3. Backend

Upload isi `backend/Code.gs` ke project Google Apps Script yang terhubung dengan spreadsheet database.

Pastikan Web App Apps Script dideploy agar frontend dapat mengirim POST ke URL `/exec`.

## 4. Initial Owner

Jika akun Owner belum ada, jalankan fungsi setup Owner yang tersedia di Apps Script secara manual dari editor. Jangan expose secret atau password ke frontend.

## Role

- OWNER: seluruh pengaturan, pengguna, karyawan, hari libur, approval Owner.
- HRD/BM: data karyawan, membuat cuti untuk orang lain, approval Management bila role tersebut menjadi Management Approver.
- ADMIN: kelola data karyawan, tanpa hak approval otomatis.
- KARYAWAN: melihat data miliknya; menu self-service pengajuan tidak ditampilkan sesuai requirement saat ini.
