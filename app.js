const state = {
  token: localStorage.getItem('cuti_token') || '',
  user: JSON.parse(localStorage.getItem('cuti_user') || 'null'),
  page: 'dashboard',
  data: {
    employees: [],
    leaves: [],
    approvals: [],
    holidays: [],
    users: [],
    settings: {}
  },
  employeeSearch: '',
  employeeFilter: 'all',
  selectedEmployees: new Set()
};


/* ==================================================
   BASIC HELPERS
================================================== */

const $ = id => document.getElementById(id);

const apiUrl = () =>
  window.APP_CONFIG?.API_URL || '';

const esc = (v = '') =>
  String(v).replace(
    /[&<>'"]/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[c])
  );

const fmtDate = v => {
  if (!v) return '-';

  const d = new Date(v);

  return isNaN(d)
    ? String(v).slice(0, 10)
    : new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(d);
};

const inputDate = v => {
  if (!v) return '';

  const s = String(v);

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  const d = new Date(v);

  return isNaN(d)
    ? s.slice(0, 10)
    : d.toISOString().slice(0, 10);
};

const roleLabel = r =>
  ({
    OWNER: 'Owner',
    HRD: 'HRD',
    BM: 'BM',
    ADMIN: 'Admin',
    KARYAWAN: 'Karyawan'
  })[r] || r;

const initials = n =>
  String(n || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(x => x[0])
    .join('')
    .toUpperCase() || '?';

const active = x =>
  String(x?.Status ?? x?.status ?? '').toLowerCase() === 'aktif';


function badge(status = '') {

  let c = 'bg-slate-100 text-slate-600';

  if (/Disetujui/.test(status)) {
    c = 'bg-emerald-50 text-emerald-700';
  }

  else if (/Menunggu/.test(status)) {
    c = 'bg-amber-50 text-amber-700';
  }

  else if (/Ditolak|Nonaktif/.test(status)) {
    c = 'bg-red-50 text-red-700';
  }

  else if (/Aktif/.test(status)) {
    c = 'bg-emerald-50 text-emerald-700';
  }

  return `
    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${c}">
      <span class="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
      ${esc(status)}
    </span>
  `;
}


function emptyState(
  icon,
  title,
  desc = 'Belum ada data di bagian ini.'
) {

  return `
    <div class="py-16 text-center">

      <div class="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 grid place-items-center">
        <i data-lucide="${icon}" class="w-6"></i>
      </div>

      <div class="font-black mt-4">
        ${esc(title)}
      </div>

      <div class="text-sm text-slate-400 mt-1">
        ${esc(desc)}
      </div>

    </div>
  `;
}


function toast(message, type = 'success') {

  const root = $('toastRoot');

  const el = document.createElement('div');

  el.className =
    'toast bg-white border border-slate-100 shadow-soft rounded-2xl px-4 py-3 flex items-center gap-3 min-w-[290px]';

  const icon =
    type === 'error'
      ? 'circle-alert'
      : type === 'info'
        ? 'info'
        : 'circle-check';

  const color =
    type === 'error'
      ? 'text-red-500'
      : type === 'info'
        ? 'text-indigo-500'
        : 'text-emerald-500';

  el.innerHTML = `
    <i data-lucide="${icon}" class="${color} w-5"></i>
    <div class="text-sm font-semibold">
      ${esc(message)}
    </div>
  `;

  root.appendChild(el);

  lucide.createIcons();

  setTimeout(() => el.remove(), 4000);
}


function showLoader(text = 'Memuat...') {

  $('globalLoaderText').textContent = text;

  $('globalLoader').classList.remove('hidden');

  $('globalLoader').classList.add('flex');
}


function hideLoader() {

  $('globalLoader').classList.add('hidden');

  $('globalLoader').classList.remove('flex');
}


function runWithButton(
  btn,
  fn,
  label = 'Memproses...'
) {

  if (!btn) {
    return fn();
  }

  const old = btn.innerHTML;

  btn.disabled = true;

  btn.classList.add(
    'opacity-70',
    'cursor-wait'
  );

  btn.innerHTML =
    `<span class="loader"></span>${label}`;

  return Promise.resolve()
    .then(fn)
    .finally(() => {

      btn.disabled = false;

      btn.classList.remove(
        'opacity-70',
        'cursor-wait'
      );

      btn.innerHTML = old;

      lucide.createIcons();

    });
}


/* ==================================================
   API
================================================== */

/*
 * VERSI DIAGNOSTIC
 *
 * Fungsi ini sengaja menampilkan:
 *
 * 1. Action yang dikirim
 * 2. HTTP status
 * 3. URL Apps Script
 * 4. Raw response
 * 5. JSON response
 *
 * Jadi kalau masih gagal,
 * kita bisa langsung tahu titik masalahnya.
 */

async function api(
  action,
  payload = {},
  token = state.token
) {

  const url = apiUrl();

  console.groupCollapsed(
    `%cAPI REQUEST → ${action}`,
    'color:#4f46e5;font-weight:bold'
  );

  console.log('URL:', url);

  console.log('Action:', action);

  console.log('Payload:', payload);

  console.log(
    'Has Token:',
    Boolean(token)
  );

  console.groupEnd();


  /* ----------------------------------------------
     CEK URL
  ---------------------------------------------- */

  if (!url) {

    console.error(
      'API URL kosong.'
    );

    throw new Error(
      'API URL belum diisi di frontend/config.js'
    );
  }


  if (
    url.includes(
      'PASTE_APPS_SCRIPT'
    )
  ) {

    console.error(
      'API URL masih placeholder.'
    );

    throw new Error(
      'API URL belum diisi di frontend/config.js'
    );
  }


  /* ----------------------------------------------
     REQUEST
  ---------------------------------------------- */

  let res;

  try {

    res = await fetch(
      url,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'text/plain;charset=utf-8'
        },

        body: JSON.stringify({
          action,
          ...payload,

          ...(token
            ? { token }
            : {})
        })
      }
    );

  }

  catch (error) {

    console.error(
      'FETCH ERROR:',
      error
    );

    throw new Error(
      'Tidak bisa terhubung ke server Apps Script. Pastikan URL Web App benar dan deployment dapat diakses.'
    );
  }


  /* ----------------------------------------------
     HTTP RESPONSE
  ---------------------------------------------- */

  console.log(
    'HTTP STATUS:',
    res.status
  );

  console.log(
    'HTTP OK:',
    res.ok
  );

  console.log(
    'RESPONSE URL:',
    res.url
  );


  /* ----------------------------------------------
     READ RAW RESPONSE
  ---------------------------------------------- */

  let raw;

  try {

    raw = await res.text();

  }

  catch (error) {

    console.error(
      'Gagal membaca response:',
      error
    );

    throw new Error(
      'Response dari server tidak dapat dibaca.'
    );
  }


  console.log(
    'RAW RESPONSE:',
    raw
  );


  /* ----------------------------------------------
     JSON PARSE
  ---------------------------------------------- */

  let data;

  try {

    data = JSON.parse(raw);

  }

  catch (error) {

    console.error(
      'JSON PARSE ERROR:',
      error
    );

    console.error(
      'Response yang diterima:',
      raw
    );

    throw new Error(
      'Server tidak mengembalikan response JSON yang valid.'
    );
  }


  /* ----------------------------------------------
     RESPONSE OBJECT
  ---------------------------------------------- */

  console.log(
    'PARSED RESPONSE:',
    data
  );


  /* ----------------------------------------------
     API ERROR
  ---------------------------------------------- */

  if (!data.success) {

    console.error(
      `API ${action} gagal:`,
      data
    );

    throw new Error(
      data.message ||
      `API ${action} gagal`
    );
  }


  /* ----------------------------------------------
     SUCCESS
  ---------------------------------------------- */

  console.log(
    `%cAPI ${action} BERHASIL`,
    'color:#16a34a;font-weight:bold',
    data
  );


  return data;
}


/* ==================================================
   SESSION
================================================== */

function saveSession(x) {

  state.token = x.token;

  state.user = x.user;

  localStorage.setItem(
    'cuti_token',
    x.token
  );

  localStorage.setItem(
    'cuti_user',
    JSON.stringify(x.user)
  );
}


function clearSession() {

  state.token = '';

  state.user = null;

  localStorage.removeItem(
    'cuti_token'
  );

  localStorage.removeItem(
    'cuti_user'
  );
}


/* ==================================================
   MODAL
================================================== */

function closeModal() {

  $('modalRoot').innerHTML = '';
}


function openModal(html) {

  $('modalRoot').innerHTML = html;

  lucide.createIcons();
}


/* ==================================================
   DATA HELPERS
================================================== */

function employeeById(id) {

  return state.data.employees.find(
    e =>
      String(e['ID Karyawan']) ===
      String(id)
  );
}


function leaveEmployee(l) {

  return employeeById(
    l.employeeId
  );
}


function approvedLeaves() {

  return state.data.leaves.filter(
    x =>
      [
        'Disetujui',
        'Disetujui dengan Pengecualian'
      ].includes(x.status)
  );
}


function getSelfEmployee() {

  return state.user?.employeeId
    ? employeeById(
        state.user.employeeId
      )
    : null;
}


function canManageEmployees() {

  return [
    'OWNER',
    'HRD',
    'BM',
    'ADMIN'
  ].includes(
    state.user?.role
  );
}


function canCreateLeave() {

  return [
    'OWNER',
    'HRD',
    'BM',
    'KARYAWAN'
  ].includes(
    state.user?.role
  );
}


/* ==================================================
   NAVIGATION
================================================== */

const navItems = [

  [
    'dashboard',
    'layout-dashboard',
    'Overview',
    [
      'OWNER',
      'HRD',
      'BM',
      'ADMIN',
      'KARYAWAN'
    ]
  ],

  [
    'leaves',
    'calendar-check-2',
    'Data Cuti',
    [
      'OWNER',
      'HRD',
      'BM',
      'ADMIN',
      'KARYAWAN'
    ]
  ],

  [
    'create',
    'plus-circle',
    'Ajukan Cuti',
    [
      'OWNER',
      'HRD',
      'BM',
      'KARYAWAN'
    ]
  ],

  [
    'approvals',
    'clipboard-check',
    'Approval',
    [
      'OWNER',
      'HRD',
      'BM'
    ]
  ],

  [
    'employees',
    'users-round',
    'Karyawan',
    [
      'OWNER',
      'HRD',
      'BM',
      'ADMIN'
    ]
  ],

  [
    'holidays',
    'calendar-off',
    'Hari Libur',
    [
      'OWNER'
    ]
  ],

  [
    'users',
    'shield-user',
    'Pengguna',
    [
      'OWNER'
    ]
  ],

  [
    'settings',
    'settings-2',
    'Pengaturan',
    [
      'OWNER'
    ]
  ]

];


function renderNav() {

  const groups = [

    {
      label: 'Overview',
      ids: ['dashboard']
    },

    {
      label: 'Leave',
      ids: [
        'leaves',
        'create',
        'approvals'
      ]
    },

    {
      label: 'People',
      ids: [
        'employees',
        'users'
      ]
    },

    {
      label: 'Master Data',
      ids: [
        'holidays',
        'settings'
      ]
    }

  ];


  const html =
    groups
      .map(g => {

        const items =
          navItems.filter(
            x =>
              g.ids.includes(x[0]) &&
              x[3].includes(
                state.user?.role
              )
          );


        if (!items.length) {
          return '';
        }


        return `
          <div class="px-2 pt-4 pb-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-400">
            ${g.label}
          </div>
        `

        +

        items
          .map(
            ([
              id,
              icon,
              label
            ]) => {

              const needsAttention =
                id === 'approvals' &&
                state.data.approvals.some(
                  a =>
                    a['Status Management'] ===
                      'Menunggu' ||

                    a['Status Pengecualian Owner'] ===
                      'Menunggu' ||

                    a['Status Owner'] ===
                      'Menunggu'
                );


              return `
                <button
                  data-page="${id}"
                  class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 ${state.page === id ? 'nav-active' : ''}"
                >

                  <i
                    data-lucide="${icon}"
                    class="w-4"
                  ></i>

                  ${label}

                  ${
                    needsAttention
                      ? `
                        <span class="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-amber-100 text-amber-700 text-[10px] grid place-items-center font-black">
                          !
                        </span>
                      `
                      : ''
                  }

                </button>
              `;
            }
          )
          .join('');

      })
      .join('');


  $('nav').innerHTML = html;


  document
    .querySelectorAll('.nav-btn')
    .forEach(
      b =>
        b.onclick = () => {

          state.page =
            b.dataset.page;

          closeSidebar();

          renderPage();
        }
    );


  lucide.createIcons();
}


/* ==================================================
   HEADER / SIDEBAR
================================================== */

function setHeader(t, s) {

  $('pageTitle').textContent = t;

  $('pageSubtitle').textContent = s;
}


function openSidebar() {

  $('sidebar')
    .classList
    .remove('-translate-x-full');

  $('mobileBackdrop')
    .classList
    .remove('hidden');
}


function closeSidebar() {

  $('sidebar')
    .classList
    .add('-translate-x-full');

  $('mobileBackdrop')
    .classList
    .add('hidden');
}


/* ==================================================
   LOAD DATA
================================================== */

async function loadData(show = true) {

  if (show) {
    showLoader(
      'Memuat data workspace...'
    );
  }


  try {

    const jobs = [

      api('getEmployees')
        .then(
          x =>
            state.data.employees =
              x.employees || []
        ),

      api('getLeaves')
        .then(
          x =>
            state.data.leaves =
              x.leaves || []
        )

    ];


    if (
      state.user?.role !==
      'KARYAWAN'
    ) {

      jobs.push(
        api('getHolidays')
          .then(
            x =>
              state.data.holidays =
                x.holidays || []
          )
      );
    }


    if (
      [
        'OWNER',
        'HRD',
        'BM'
      ].includes(
        state.user?.role
      )
    ) {

      jobs.push(
        api('getApprovals')
          .then(
            x =>
              state.data.approvals =
                x.approvals || []
          )
      );
    }


    if (
      state.user?.role ===
      'OWNER'
    ) {

      jobs.push(

        api('getSettings')
          .then(
            x =>
              state.data.settings =
                x.settings || {}
          )

      );


      jobs.push(

        api('getUsers')
          .then(
            x =>
              state.data.users =
                x.users || []
          )

      );
    }


    await Promise.all(jobs);

  }

  finally {

    if (show) {
      hideLoader();
    }

  }
}


/* ==================================================
   STATS
================================================== */

function stats() {

  const l =
    state.data.leaves;

  return {

    total: l.length,

    pending:
      l.filter(
        x =>
          String(x.status)
            .startsWith(
              'Menunggu'
            )
      ).length,

    approved:
      l.filter(
        x =>
          String(x.status)
            .startsWith(
              'Disetujui'
            )
      ).length,

    rejected:
      l.filter(
        x =>
          x.status ===
          'Ditolak'
      ).length

  };
}


function card(
  icon,
  label,
  value,
  sub = ''
) {

  return `
    <div class="bg-white rounded-3xl border border-slate-100 shadow-card p-5 hover:-translate-y-0.5 transition">

      <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
        <i
          data-lucide="${icon}"
          class="w-5"
        ></i>
      </div>

      <div class="text-3xl font-black mt-5">
        ${value}
      </div>

      <div class="font-semibold mt-1">
        ${label}
      </div>

      <div class="text-xs text-slate-400 mt-1">
        ${sub}
      </div>

    </div>
  `;
}


/* ==================================================
   RENDER PAGE
================================================== */

function renderPage() {

  if (!state.user) {

    $('loginView')
      .classList
      .remove('hidden');

    $('appView')
      .classList
      .add('hidden');

    return;
  }


  $('loginView')
    .classList
    .add('hidden');

  $('appView')
    .classList
    .remove('hidden');


  $('sideUserName').textContent =
    state.user.nama;

  $('sideUserRole').textContent =
    roleLabel(
      state.user.role
    );

  $('sideAvatar').textContent =
    initials(
      state.user.nama
    );


  renderNav();


  const pages = {

    dashboard:
      renderDashboard,

    leaves:
      renderLeaves,

    create:
      renderCreate,

    approvals:
      renderApprovals,

    employees:
      renderEmployees,

    holidays:
      renderHolidays,

    users:
      renderUsers,

    settings:
      renderSettings

  };


  (
    pages[state.page] ||
    renderDashboard
  )();


  lucide.createIcons();
}


/* ==================================================
   DASHBOARD
================================================== */

function renderDashboard() {

  if (
    state.user.role ===
    'KARYAWAN'
  ) {

    return renderEmployeeDashboard();

  }


  setHeader(
    'Dashboard',
    'Ringkasan aktivitas dan pekerjaan yang perlu diproses'
  );


  const s = stats();


  const pending =
    state.data.approvals
      .filter(
        a =>
          a['Status Management'] ===
            'Menunggu' ||

          a['Status Pengecualian Owner'] ===
            'Menunggu' ||

          a['Status Owner'] ===
            'Menunggu'
      )
      .slice(0, 5);


  $('content').innerHTML = `

    <div class="fade-in">

      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">

        <div>

          <div class="text-sm text-slate-400">
            Selamat datang kembali,
          </div>

          <h2 class="text-3xl font-black mt-1">
            ${esc(state.user.nama)} 👋
          </h2>

        </div>


        <button
          data-page="create"
          class="quick-create hidden md:flex items-center gap-2 bg-slate-950 text-white rounded-2xl px-5 py-3 font-bold hover:bg-indigo-700"
        >

          <i
            data-lucide="plus"
            class="w-4"
          ></i>

          Ajukan Cuti

        </button>

      </div>


      <div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">

        ${card(
          'files',
          'Total Pengajuan',
          s.total,
          'Semua periode'
        )}

        ${card(
          'clock-3',
          'Menunggu',
          s.pending,
          'Perlu diproses'
        )}

        ${card(
          'circle-check',
          'Disetujui',
          s.approved,
          'Sudah final'
        )}

        ${card(
          'circle-x',
          'Ditolak',
          s.rejected,
          'Tidak disetujui'
        )}

      </div>


      <div class="grid xl:grid-cols-[1.35fr_.65fr] gap-5 mt-5">

        <div class="bg-white rounded-3xl border border-slate-100 shadow-card p-6">

          <div class="flex justify-between items-center">

            <div>

              <h3 class="font-black text-lg">
                Aktivitas terbaru
              </h3>

              <p class="text-xs text-slate-400 mt-1">
                Pengajuan cuti terakhir
              </p>

            </div>

            <button
              data-page="leaves"
              class="text-xs font-bold text-indigo-600"
            >
              Lihat semua
            </button>

          </div>

          <div class="mt-5">
            ${renderRecentLeaves()}
          </div>

        </div>


        <div class="bg-slate-950 text-white rounded-3xl p-6 shadow-card">

          <div class="w-11 h-11 rounded-2xl bg-white/10 grid place-items-center">

            <i data-lucide="clipboard-check"></i>

          </div>

          <h3 class="font-black text-xl mt-5">
            Yang perlu diproses
          </h3>

          <div class="mt-4 space-y-3">

            ${
              pending.length

                ? pending
                    .map(
                      a => `
                        <div class="rounded-2xl bg-white/10 p-4">

                          <div class="text-sm font-bold">
                            ${esc(a['ID Cuti'])}
                          </div>

                          <div class="text-xs text-slate-300 mt-1">

                            ${
                              a['Status Pengecualian Owner'] ===
                              'Menunggu'

                                ? 'Pengecualian Owner'

                                : a['Status Management'] ===
                                  'Menunggu'

                                  ? 'Approval Management'

                                  : 'Approval Owner'
                            }

                          </div>

                        </div>
                      `
                    )
                    .join('')

                : `
                    <div class="rounded-2xl bg-white/10 p-4 text-sm text-slate-300">
                      Tidak ada pekerjaan yang menunggu.
                    </div>
                  `
            }

          </div>

        </div>

      </div>

    </div>

  `;


  document
    .querySelectorAll(
      '[data-page]'
    )
    .forEach(
      b =>
        b.onclick = () => {

          state.page =
            b.dataset.page;

          renderPage();

        }
    );


  lucide.createIcons();
}


/* ==================================================
   EMPLOYEE DASHBOARD
================================================== */

function renderEmployeeDashboard() {

  setHeader(
    'Dashboard',
    'Ringkasan cuti pribadi kamu'
  );


  const e =
    getSelfEmployee();


  const leaves =
    state.data.leaves;


  const recent =
    leaves
      .slice(-4)
      .reverse();


  if (!e) {

    $('content').innerHTML =
      emptyState(
        'user-round-x',
        'Akun belum terhubung',
        'Hubungi Owner/HRD untuk menghubungkan akun dengan data karyawan.'
      );

    return;
  }


  $('content').innerHTML = `

    <div class="fade-in">

      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">

        <div>

          <div class="text-sm text-slate-400">
            Selamat datang,
          </div>

          <h2 class="text-3xl font-black mt-1">
            ${esc(e.Nama)} 👋
          </h2>

          <p class="text-sm text-slate-500 mt-1">
            ${esc(e.Jabatan)} · ${esc(e.Departemen)}
          </p>

        </div>


        <button
          id="dashCreate"
          class="flex items-center justify-center gap-2 bg-slate-950 text-white rounded-2xl px-5 py-3 font-bold hover:bg-indigo-700"
        >

          <i
            data-lucide="plus"
            class="w-4"
          ></i>

          Ajukan Cuti

        </button>

      </div>


      <div class="grid sm:grid-cols-3 gap-4">

        <div class="bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-3xl p-6 shadow-soft">

          <div class="text-indigo-200 text-sm font-semibold">
            Sisa cuti
          </div>

          <div class="text-5xl font-black mt-2">
            ${e['Sisa Cuti'] ?? 0}
          </div>

          <div class="text-sm text-indigo-100 mt-1">
            hari
          </div>

        </div>


        ${card(
          'calendar-days',
          'Hak Cuti',
          e['Hak Cuti'] ?? 0,
          `Periode ${e['Periode Cuti Mulai'] || '-'} s/d ${e['Periode Cuti Selesai'] || '-'}`
        )}


        ${card(
          'history',
          'Sudah Dipakai',
          e['Cuti Terpakai'] ?? 0,
          'Dalam periode berjalan'
        )}

      </div>


      <div class="grid xl:grid-cols-[1.2fr_.8fr] gap-5 mt-5">

        <div class="bg-white rounded-3xl border border-slate-100 shadow-card p-6">

          <div class="flex justify-between items-center">

            <div>

              <h3 class="font-black text-lg">
                Riwayat terbaru
              </h3>

              <p class="text-xs text-slate-400 mt-1">
                Pengajuan cuti kamu
              </p>

            </div>

            <button
              id="dashHistory"
              class="text-xs font-bold text-indigo-600"
            >
              Lihat semua
            </button>

          </div>


          <div class="mt-5">

            ${
              recent.length
                ? recent
                    .map(
                      l =>
                        leaveRow(
                          l,
                          true
                        )
                    )
                    .join('')

                : emptyState(
                    'calendar-x',
                    'Belum ada riwayat cuti',
                    'Saat kamu mengajukan cuti, riwayatnya akan muncul di sini.'
                  )
            }

          </div>

        </div>


        <div class="bg-white rounded-3xl border border-slate-100 shadow-card p-6">

          <h3 class="font-black text-lg">
            Informasi masa kerja
          </h3>

          <div class="mt-5 space-y-4">

            ${infoLine(
              'briefcase-business',
              'Masa kerja',
              `${e['Masa Kerja Tahun'] || 0} tahun ${e['Masa Kerja Bulan'] || 0} bulan`
            )}

            ${infoLine(
              'calendar-days',
              'Mulai bekerja',
              fmtDate(
                e['Tanggal Mulai Masa Kerja']
              )
            )}

            ${infoLine(
              'badge-check',
              'Status',
              badge(e.Status)
            )}

          </div>

        </div>

      </div>

    </div>

  `;


  $('dashCreate').onclick = () => {

    state.page = 'create';

    renderPage();

  };


  $('dashHistory').onclick = () => {

    state.page = 'leaves';

    renderPage();

  };


  lucide.createIcons();
}


/* ==================================================
   LEAVE HELPERS
================================================== */

function renderRecentLeaves() {

  const l =
    state.data.leaves
      .slice(-6)
      .reverse();


  return l.length

    ? `
      <div class="divide-y divide-slate-100">
        ${l.map(x => leaveRow(x)).join('')}
      </div>
    `

    : emptyState(
        'calendar-x',
        'Belum ada pengajuan'
      );
}


function leaveRow(
  l,
  compact = false
) {

  const e =
    leaveEmployee(l);


  return `

    <div class="py-4 flex items-center gap-3 ${compact ? 'border-b border-slate-100' : ''}">

      <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center font-black text-xs shrink-0">
        ${initials(
          e?.Nama ||
          l.employeeId
        )}
      </div>


      <div class="min-w-0 flex-1">

        <div class="font-bold text-sm truncate">
          ${esc(
            e?.Nama ||
            l.employeeId
          )}
        </div>

        <div class="text-xs text-slate-400 mt-1">

          ${fmtDate(
            l.startDate
          )}

          –

          ${fmtDate(
            l.endDate
          )}

          ·

          ${esc(l.days)}
          hari

          ·

          ${esc(l.type)}

        </div>

      </div>


      <div>
        ${badge(l.status)}
      </div>

    </div>

  `;
}


/* ==================================================
   LEAVES PAGE
================================================== */

function renderLeaves() {

  setHeader(
    'Data Cuti',
    state.user.role === 'KARYAWAN'
      ? 'Riwayat pengajuan cuti kamu'
      : 'Semua pengajuan cuti yang dapat kamu akses'
  );


  const l =
    [...state.data.leaves]
      .reverse();


  $('content').innerHTML = `

    <div class="fade-in">

      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">

        <div>

          <h2 class="text-2xl font-black">

            ${
              state.user.role ===
              'KARYAWAN'
                ? 'Riwayat Cuti'
                : 'Pengajuan Cuti'
            }

          </h2>

          <p class="text-sm text-slate-400 mt-1">
            ${l.length} pengajuan ditemukan
          </p>

        </div>


        <div class="flex gap-2">

          <div class="relative">

            <i
              data-lucide="search"
              class="absolute left-3 top-1/2 -translate-y-1/2 w-4 text-slate-400"
            ></i>

            <input
              id="leaveSearch"
              class="w-full sm:w-64 rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 bg-white outline-none focus:ring-4 focus:ring-indigo-100"
              placeholder="Cari ID / nama..."
            >

          </div>


          ${
            canCreateLeave()
              ? `
                <button
                  id="leaveCreate"
                  class="rounded-xl bg-slate-950 text-white px-4 py-2.5 font-bold flex items-center gap-2"
                >

                  <i
                    data-lucide="plus"
                    class="w-4"
                  ></i>

                  Ajukan Cuti

                </button>
              `
              : ''
          }

        </div>

      </div>


      <div
        id="leaveTable"
        class="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden"
      ></div>

    </div>

  `;


  const draw = () => {

    const q =
      ($('leaveSearch')?.value || '')
        .toLowerCase();


    const rows =
      l.filter(
        x =>
          `${x.id} ${leaveEmployee(x)?.Nama || ''} ${x.type} ${x.status}`
            .toLowerCase()
            .includes(q)
      );


    $('leaveTable').innerHTML =
      rows.length

        ? `
          <div class="overflow-auto">

            <table class="w-full text-sm">

              <thead class="bg-slate-50">

                <tr>

                  <th class="text-left px-5 py-3">
                    Pengajuan
                  </th>

                  <th class="text-left px-5 py-3">
                    Tanggal
                  </th>

                  <th class="text-left px-5 py-3">
                    Jenis
                  </th>

                  <th class="text-left px-5 py-3">
                    Hari
                  </th>

                  <th class="text-left px-5 py-3">
                    Status
                  </th>

                </tr>

              </thead>


              <tbody>

                ${rows
                  .map(
                    x => `

                      <tr class="table-row border-t">

                        <td class="px-5 py-4">

                          <div class="font-bold">
                            ${esc(x.id)}
                          </div>

                          <div class="text-xs text-slate-400 mt-1">
                            ${esc(
                              leaveEmployee(x)?.Nama ||
                              x.employeeId
                            )}
                          </div>

                        </td>


                        <td class="px-5 py-4">

                          ${fmtDate(
                            x.startDate
                          )}

                          –

                          ${fmtDate(
                            x.endDate
                          )}

                        </td>


                        <td class="px-5 py-4">
                          ${esc(x.type)}
                        </td>


                        <td class="px-5 py-4 font-bold">
                          ${esc(x.days)}
                        </td>


                        <td class="px-5 py-4">
                          ${badge(x.status)}
                        </td>

                      </tr>

                    `
                  )
                  .join('')}

              </tbody>

            </table>

          </div>
        `

        : emptyState(
            'search-x',
            'Data tidak ditemukan',
            'Coba kata kunci lain.'
          );

  };


  $('leaveSearch').oninput =
    draw;


  if ($('leaveCreate')) {

    $('leaveCreate').onclick =
      () => {

        state.page = 'create';

        renderPage();

      };

  }


  draw();

  lucide.createIcons();
}


/* ==================================================
   CREATE LEAVE
================================================== */

function renderCreate() {

  setHeader(
    'Ajukan Cuti',
    'Buat pengajuan baru sesuai aturan perusahaan'
  );


  const self =
    state.user.role ===
    'KARYAWAN';


  const employees =
    state.data.employees
      .filter(e => active(e));


  const e =
    self
      ? getSelfEmployee()
      : null;


  $('content').innerHTML = `

    <div class="fade-in max-w-4xl">

      <div class="bg-white rounded-3xl border border-slate-100 shadow-card p-6 sm:p-8">

        <div class="flex items-start gap-4">

          <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 grid place-items-center">

            <i data-lucide="calendar-plus"></i>

          </div>


          <div>

            <h2 class="text-2xl font-black">
              Pengajuan cuti baru
            </h2>

            <p class="text-sm text-slate-400 mt-1">
              Pastikan tanggal dan alasan sudah sesuai.
            </p>

          </div>

        </div>


        <form
          id="leaveForm"
          class="mt-8 space-y-6"
        >

          <label class="block">

            <span class="text-sm font-bold">
              Karyawan
            </span>


            ${
              self

                ? `

                  <div class="mt-2 rounded-2xl bg-slate-50 px-4 py-3.5 font-bold">

                    ${esc(
                      e?.Nama ||
                      'Akun belum terhubung'
                    )}

                  </div>


                  <input
                    type="hidden"
                    name="employeeId"
                    value="${esc(
                      e?.['ID Karyawan'] ||
                      ''
                    )}"
                  >

                `

                : `

                  <select
                    name="employeeId"
                    class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3.5 bg-white"
                    required
                  >

                    <option value="">
                      Pilih karyawan
                    </option>

                    ${employees
                      .map(
                        x => `
                          <option value="${esc(
                            x['ID Karyawan']
                          )}">
                            ${esc(x.Nama)}
                            ·
                            ${esc(x.Jabatan)}
                          </option>
                        `
                      )
                      .join('')}

                  </select>

                `
            }

          </label>


          <div class="grid sm:grid-cols-2 gap-5">

            <label>

              <span class="text-sm font-bold">
                Tanggal mulai
              </span>

              <input
                name="tanggalMulai"
                type="date"
                class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3.5"
                required
              >

            </label>


            <label>

              <span class="text-sm font-bold">
                Tanggal selesai
              </span>

              <input
                name="tanggalSelesai"
                type="date"
                class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3.5"
                required
              >

            </label>

          </div>


          <div class="grid sm:grid-cols-2 gap-5">

            <label>

              <span class="text-sm font-bold">
                Jenis cuti
              </span>

              <select
                name="jenisCuti"
                class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3.5"
              >

                <option>
                  Cuti Tahunan
                </option>

                <option>
                  Cuti Pernikahan
                </option>

              </select>

            </label>


            <label>

              <span class="text-sm font-bold">
                Alasan
              </span>

              <input
                name="alasan"
                class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3.5"
                placeholder="Contoh: Keperluan keluarga"
                required
              >

            </label>

          </div>


          <label>

            <span class="text-sm font-bold">
              Catatan
              <span class="font-normal text-slate-400">
                (opsional)
              </span>
            </span>

            <textarea
              name="catatan"
              rows="4"
              class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3.5"
              placeholder="Tambahkan catatan jika diperlukan"
            ></textarea>

          </label>


          <div class="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 flex gap-3 text-sm text-indigo-800">

            <i
              data-lucide="info"
              class="w-5 shrink-0"
            ></i>

            <div>

              Pengajuan normal minimal
              <b>
                H-${esc(
                  state.data.settings.MIN_HARI_PENGAJUAN ||
                  7
                )}
              </b>.

              Cuti normal maksimal
              <b>
                ${esc(
                  state.data.settings.MAX_HARI_CUTI ||
                  3
                )}
                hari kerja
              </b>.

            </div>

          </div>


          <div class="flex justify-end gap-2">

            <button
              type="button"
              id="cancelLeave"
              class="px-5 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>


            <button
              id="saveLeave"
              class="px-6 py-3 rounded-xl bg-slate-950 text-white font-bold flex items-center gap-2"
            >

              <i
                data-lucide="send"
                class="w-4"
              ></i>

              Kirim Pengajuan

            </button>

          </div>

        </form>

      </div>

    </div>

  `;


  const min =
    new Date();

  min.setDate(
    min.getDate() +
    Number(
      state.data.settings
        .MIN_HARI_PENGAJUAN ||
      7
    )
  );


  $('leaveForm')
    .tanggalMulai
    .min =
    min
      .toISOString()
      .slice(0, 10);


  $('leaveForm')
    .tanggalSelesai
    .min =
    min
      .toISOString()
      .slice(0, 10);


  $('cancelLeave').onclick =
    () => {

      state.page =
        'dashboard';

      renderPage();

    };


  $('leaveForm').onsubmit =
    async ev => {

      ev.preventDefault();


      const b =
        $('saveLeave');


      await runWithButton(
        b,

        async () => {

          try {

            const payload =
              Object.fromEntries(
                new FormData(
                  ev.target
                ).entries()
              );


            await api(
              'createLeave',
              payload
            );


            toast(
              'Pengajuan cuti berhasil dibuat'
            );


            await loadData();


            state.page =
              'leaves';


            renderPage();

          }

          catch (err) {

            toast(
              err.message,
              'error'
            );

          }

        },

        'Mengirim...'
      );

    };


  lucide.createIcons();
}


/* ==================================================
   APPROVAL
================================================== */

function renderApprovals() {

  setHeader(
    'Approval',
    'Tinjau dan proses pengajuan sesuai kewenangan'
  );


  const rows =
    [...state.data.approvals]
      .reverse();


  $('content').innerHTML = `

    <div class="fade-in">

      <div class="mb-5">

        <h2 class="text-2xl font-black">
          Pusat Approval
        </h2>

        <p class="text-sm text-slate-400 mt-1">
          ${rows.length} item dalam antrean.
        </p>

      </div>


      <div class="space-y-4">

        ${
          rows.length

            ? rows
                .map(
                  renderApprovalCard
                )
                .join('')

            : emptyState(
                'clipboard-check',
                'Tidak ada approval',
                'Semua pengajuan yang menjadi kewenanganmu sudah diproses.'
              )
        }

      </div>

    </div>

  `;


  lucide.createIcons();

  bindApprovalActions();
}


function renderApprovalCard(a) {

  const l =
    state.data.leaves.find(
      x =>
        String(x.id) ===
        String(a['ID Cuti'])
    );


  const e =
    l &&
    leaveEmployee(l);


  const exception =
    a['Status Pengecualian Owner'] ===
    'Menunggu';


  const mgmt =
    a['Status Management'] ===
    'Menunggu';


  const owner =
    a['Status Owner'] ===
    'Menunggu';


  let action = '';


  if (
    state.user.role ===
      'OWNER' &&
    exception
  ) {

    action = `

      <button
        data-act="approve-ex"
        data-id="${esc(a['ID Cuti'])}"
        class="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold"
      >
        Setujui Pengecualian
      </button>

      <button
        data-act="reject-ex"
        data-id="${esc(a['ID Cuti'])}"
        class="px-4 py-2 rounded-xl bg-red-50 text-red-700 font-bold"
      >
        Tolak
      </button>

    `;

  }

  else if (
    mgmt &&
    state.user.role ===
      state.user.managementApprovalRole
  ) {

    action = `

      <button
        data-act="approve-mgmt"
        data-id="${esc(a['ID Cuti'])}"
        class="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold"
      >
        Setujui Management
      </button>

      <button
        data-act="reject-mgmt"
        data-id="${esc(a['ID Cuti'])}"
        class="px-4 py-2 rounded-xl bg-red-50 text-red-700 font-bold"
      >
        Tolak
      </button>

    `;

  }

  else if (
    owner &&
    state.user.role ===
      'OWNER'
  ) {

    action = `

      <button
        data-act="approve-owner"
        data-id="${esc(a['ID Cuti'])}"
        class="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold"
      >
        Setujui Final
      </button>

      <button
        data-act="reject-owner"
        data-id="${esc(a['ID Cuti'])}"
        class="px-4 py-2 rounded-xl bg-red-50 text-red-700 font-bold"
      >
        Tolak
      </button>

    `;

  }


  return `

    <div class="bg-white rounded-3xl border border-slate-100 shadow-card p-5 sm:p-6">

      <div class="flex flex-col lg:flex-row lg:items-center gap-5">

        <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 grid place-items-center font-black shrink-0">
          ${initials(
            e?.Nama ||
            a['ID Cuti']
          )}
        </div>


        <div class="flex-1 min-w-0">

          <div class="flex flex-wrap items-center gap-2">

            <span class="font-black">
              ${esc(
                e?.Nama ||
                a['ID Cuti']
              )}
            </span>

            ${badge(
              l?.status ||
              'Menunggu'
            )}

          </div>


          <div class="text-sm text-slate-500 mt-1">

            ${
              l

                ? `
                    ${fmtDate(
                      l.startDate
                    )}

                    –

                    ${fmtDate(
                      l.endDate
                    )}

                    ·

                    ${esc(l.days)}
                    hari

                    ·

                    ${esc(l.type)}
                  `

                : 'Data cuti tidak ditemukan'
            }

          </div>


          <div class="text-xs text-slate-400 mt-2">
            ${esc(
              l?.reason ||
              ''
            )}
          </div>

        </div>


        <div class="flex flex-wrap gap-2 lg:justify-end">

          ${
            action ||
            `
              <span class="text-xs text-slate-400">
                Menunggu tahap berikutnya
              </span>
            `
          }

        </div>

      </div>

    </div>

  `;
}


function bindApprovalActions() {

  document
    .querySelectorAll(
      '[data-act]'
    )
    .forEach(
      b =>
        b.onclick =
          async () => {

            const act =
              b.dataset.act;

            const id =
              b.dataset.id;


            const map = {

              'approve-ex':
                [
                  'approveOwnerException',
                  'Menyetujui pengecualian...'
                ],

              'reject-ex':
                [
                  'rejectOwnerException',
                  'Menolak...'
                ],

              'approve-mgmt':
                [
                  'approveManagement',
                  'Menyetujui...'
                ],

              'reject-mgmt':
                [
                  'rejectManagement',
                  'Menolak...'
                ],

              'approve-owner':
                [
                  'approveOwner',
                  'Menyetujui final...'
                ],

              'reject-owner':
                [
                  'rejectOwner',
                  'Menolak...'
                ]

            };


            const [
              action,
              label
            ] = map[act];


            if (
              !confirm(
                act.includes('reject')
                  ? 'Yakin menolak pengajuan ini?'
                  : 'Yakin memproses pengajuan ini?'
              )
            ) {

              return;

            }


            await runWithButton(
              b,

              async () => {

                try {

                  await api(
                    action,
                    {
                      leaveId: id,
                      catatan: ''
                    }
                  );


                  toast(
                    'Approval berhasil diproses'
                  );


                  await loadData();

                  renderPage();

                }

                catch (e) {

                  toast(
                    e.message,
                    'error'
                  );

                }

              },

              label
            );

          }
    );
}


/* ==================================================
   EMPLOYEES
================================================== */

function renderEmployees() {

  setHeader(
    'Karyawan',
    'Kelola data karyawan, akun login, saldo, dan riwayat'
  );


  const list =
    state.data.employees
      .filter(e => {

        const q =
          state.employeeSearch
            .toLowerCase();


        const match =
          !q ||
          `${e.Nama} ${e.Jabatan} ${e.Departemen} ${e['ID Karyawan']}`
            .toLowerCase()
            .includes(q);


        const f =
          state.employeeFilter ===
          'all'

            ? true

            : state.employeeFilter ===
              'active'

              ? active(e)

              : !active(e);


        return match && f;

      });


  const selected =
    [...state.selectedEmployees]
      .filter(
        id =>
          state.data.employees.some(
            e =>
              String(
                e['ID Karyawan']
              ) === String(id)
          )
      );


  state.selectedEmployees =
    new Set(selected);


  $('content').innerHTML = `

    <div class="fade-in">

      <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-5">

        <div>

          <h2 class="text-2xl font-black">
            Data Karyawan
          </h2>

          <p class="text-sm text-slate-400 mt-1">
            ${state.data.employees.length}
            karyawan terdaftar
          </p>

        </div>


        <div class="flex flex-col sm:flex-row gap-2">

          <div class="relative">

            <i
              data-lucide="search"
              class="absolute left-3 top-1/2 -translate-y-1/2 w-4 text-slate-400"
            ></i>

            <input
              id="employeeSearch"
              value="${esc(
                state.employeeSearch
              )}"
              class="w-full sm:w-64 rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 bg-white"
              placeholder="Cari karyawan..."
            >

          </div>


          <select
            id="employeeFilter"
            class="rounded-xl border border-slate-200 px-3 py-2.5 bg-white"
          >

            <option
              value="all"
              ${
                state.employeeFilter ===
                'all'
                  ? 'selected'
                  : ''
              }
            >
              Semua status
            </option>

            <option
              value="active"
              ${
                state.employeeFilter ===
                'active'
                  ? 'selected'
                  : ''
              }
            >
              Aktif
            </option>

            <option
              value="inactive"
              ${
                state.employeeFilter ===
                'inactive'
                  ? 'selected'
                  : ''
              }
            >
              Nonaktif
            </option>

          </select>


          <button
            id="addEmployee"
            class="rounded-xl bg-slate-950 text-white px-4 py-2.5 font-bold flex items-center justify-center gap-2"
          >

            <i
              data-lucide="user-round-plus"
              class="w-4"
            ></i>

            Tambah

          </button>

        </div>

      </div>


      ${
        selected.length

          ? `

            <div class="mb-3 rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">

              <div class="text-sm font-bold text-indigo-800">

                ${selected.length}
                karyawan dipilih

              </div>


              <button
                id="bulkDeactivate"
                class="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold"
              >
                Nonaktifkan terpilih
              </button>

            </div>

          `

          : ''
      }


      <div class="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">

        <div class="overflow-auto">

          ${
            list.length

              ? `

                <table class="w-full text-sm">

                  <thead class="bg-slate-50">

                    <tr>

                      <th class="px-5 py-3 text-left">

                        <input
                          id="selectAllEmployees"
                          type="checkbox"
                          ${
                            list.length &&
                            list.every(
                              e =>
                                state.selectedEmployees.has(
                                  String(
                                    e['ID Karyawan']
                                  )
                                )
                            )
                              ? 'checked'
                              : ''
                          }
                        >

                      </th>

                      <th class="text-left px-3 py-3">
                        Karyawan
                      </th>

                      <th class="text-left px-3 py-3">
                        Jabatan
                      </th>

                      <th class="text-left px-3 py-3">
                        Departemen
                      </th>

                      <th class="text-left px-3 py-3">
                        Saldo
                      </th>

                      <th class="text-left px-3 py-3">
                        Status
                      </th>

                      <th class="text-right px-5 py-3">
                        Aksi
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    ${list
                      .map(
                        e =>
                          employeeTableRow(
                            e
                          )
                      )
                      .join('')}

                  </tbody>

                </table>

              `

              : emptyState(
                  'users-round',
                  'Belum ada karyawan',
                  'Tambahkan karyawan pertama untuk mulai menggunakan sistem.'
                )
          }

        </div>

      </div>

    </div>

  `;


  $('employeeSearch').oninput =
    e => {

      state.employeeSearch =
        e.target.value;

      renderEmployees();

    };


  $('employeeFilter').onchange =
    e => {

      state.employeeFilter =
        e.target.value;

      renderEmployees();

    };


  $('addEmployee').onclick =
    () =>
      openEmployeeModal();


  if (
    $('selectAllEmployees')
  ) {

    $('selectAllEmployees')
      .onchange = e => {

        list.forEach(
          x => {

            if (
              e.target.checked
            ) {

              state.selectedEmployees
                .add(
                  String(
                    x['ID Karyawan']
                  )
                );

            }

            else {

              state.selectedEmployees
                .delete(
                  String(
                    x['ID Karyawan']
                  )
                );

            }

          }
        );


        renderEmployees();

      };

  }


  document
    .querySelectorAll(
      '[data-emp-action="view"]'
    )
    .forEach(
      b =>
        b.onclick =
          () =>
            openEmployeeProfile(
              b.dataset.id
            )
    );


  document
    .querySelectorAll(
      '[data-emp-action="edit"]'
    )
    .forEach(
      b =>
        b.onclick =
          () =>
            openEmployeeModal(
              employeeById(
                b.dataset.id
              )
            )
    );


  document
    .querySelectorAll(
      '[data-emp-action="deactivate"]'
    )
    .forEach(
      b =>
        b.onclick =
          () =>
            deactivateOne(
              b.dataset.id
            )
    );


  if ($('bulkDeactivate')) {

    $('bulkDeactivate').onclick =
      bulkDeactivate;

  }


  bindEmployeeChecks();

  lucide.createIcons();
}


function employeeTableRow(e) {

  const id =
    String(
      e['ID Karyawan']
    );


  return `

    <tr class="table-row border-t">

      <td class="px-5 py-4">

        <input
          class="emp-check"
          data-id="${esc(id)}"
          type="checkbox"
          ${
            state.selectedEmployees.has(id)
              ? 'checked'
              : ''
          }
        >

      </td>


      <td class="px-3 py-4">

        <button
          data-emp-action="view"
          data-id="${esc(id)}"
          class="flex items-center gap-3 text-left"
        >

          <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center font-black text-xs">
            ${initials(e.Nama)}
          </div>


          <div>

            <div class="font-bold hover:text-indigo-600">
              ${esc(e.Nama)}
            </div>

            <div class="text-xs text-slate-400 mt-1">
              ${esc(id)}
            </div>

          </div>

        </button>

      </td>


      <td class="px-3 py-4">
        ${esc(e.Jabatan)}
      </td>


      <td class="px-3 py-4">
        ${esc(e.Departemen)}
      </td>


      <td class="px-3 py-4">

        <div class="font-black">
          ${e['Sisa Cuti'] ?? 0}
          hari
        </div>

        <div class="text-xs text-slate-400 mt-1">
          ${e['Cuti Terpakai'] ?? 0}
          /
          ${e['Hak Cuti'] ?? 0}
          terpakai
        </div>

      </td>


      <td class="px-3 py-4">
        ${badge(e.Status)}
      </td>


      <td class="px-5 py-4">

        <div class="flex justify-end gap-1">

          <button
            data-emp-action="view"
            data-id="${esc(id)}"
            class="p-2 rounded-lg hover:bg-indigo-50 text-slate-500"
            title="Lihat profil"
          >
            <i
              data-lucide="eye"
              class="w-4"
            ></i>
          </button>


          <button
            data-emp-action="edit"
            data-id="${esc(id)}"
            class="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
            title="Edit"
          >
            <i
              data-lucide="pencil"
              class="w-4"
            ></i>
          </button>


          ${
            active(e)

              ? `

                <button
                  data-emp-action="deactivate"
                  data-id="${esc(id)}"
                  class="p-2 rounded-lg hover:bg-red-50 text-red-500"
                  title="Nonaktifkan"
                >
                  <i
                    data-lucide="user-round-x"
                    class="w-4"
                  ></i>
                </button>

              `

              : ''
          }

        </div>

      </td>

    </tr>

  `;
}


function bindEmployeeChecks() {

  document
    .querySelectorAll(
      '.emp-check'
    )
    .forEach(
      c =>
        c.onchange = () => {

          if (c.checked) {

            state.selectedEmployees
              .add(
                c.dataset.id
              );

          }

          else {

            state.selectedEmployees
              .delete(
                c.dataset.id
              );

          }


          renderEmployees();

        }
    );
}


/* ==================================================
   EMPLOYEE MODAL
================================================== */

function openEmployeeModal(
  emp = null
) {

  const edit =
    !!emp;


  openModal(`

    <div class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 overflow-auto">

      <div class="bg-white rounded-[2rem] w-full max-w-2xl shadow-soft my-8">

        <div class="p-6 sm:p-7 border-b border-slate-100 flex items-start justify-between">

          <div>

            <div class="text-xs uppercase tracking-[.16em] text-indigo-500 font-black">

              ${
                edit
                  ? 'Edit karyawan'
                  : 'Tambah karyawan'
              }

            </div>


            <h3 class="text-2xl font-black mt-1">

              ${
                edit
                  ? 'Perbarui data karyawan'
                  : 'Buat data karyawan'
              }

            </h3>


            <p class="text-sm text-slate-400 mt-1">

              ${
                edit

                  ? 'Perubahan langsung memengaruhi saldo dan profil karyawan.'

                  : 'Kamu bisa sekaligus membuat akun login Karyawan.'
              }

            </p>

          </div>


          <button
            onclick="closeModal()"
            class="p-2 rounded-xl hover:bg-slate-100"
          >

            <i
              data-lucide="x"
            ></i>

          </button>

        </div>


        <form
          id="employeeForm"
          class="p-6 sm:p-7 space-y-5"
        >

          <input
            type="hidden"
            name="employeeId"
            value="${esc(
              emp?.['ID Karyawan'] ||
              ''
            )}"
          >


          <div class="grid sm:grid-cols-2 gap-4">

            <label>

              <span class="text-sm font-bold">
                Nama lengkap
              </span>

              <input
                name="nama"
                value="${esc(
                  emp?.Nama ||
                  ''
                )}"
                class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                required
              >

            </label>


            <label>

              <span class="text-sm font-bold">
                Jabatan
              </span>

              <input
                name="jabatan"
                value="${esc(
                  emp?.Jabatan ||
                  ''
                )}"
                class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                required
              >

            </label>


            <label>

              <span class="text-sm font-bold">
                Departemen
              </span>

              <input
                name="departemen"
                value="${esc(
                  emp?.Departemen ||
                  ''
                )}"
                class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                required
              >

            </label>


            <label>

              <span class="text-sm font-bold">
                Mulai masa kerja
              </span>

              <input
                name="tanggalMulai"
                type="date"
                value="${esc(
                  inputDate(
                    emp?.[
                      'Tanggal Mulai Masa Kerja'
                    ]
                  )
                )}"
                class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                required
              >

            </label>


            <label>

              <span class="text-sm font-bold">
                Status
              </span>

              <select
                name="status"
                class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
              >

                <option
                  ${
                    String(
                      emp?.Status ||
                      'Aktif'
                    ).toLowerCase() ===
                    'aktif'
                      ? 'selected'
                      : ''
                  }
                >
                  Aktif
                </option>

                <option
                  ${
                    String(
                      emp?.Status ||
                      ''
                    ).toLowerCase() ===
                    'nonaktif'
                      ? 'selected'
                      : ''
                  }
                >
                  Nonaktif
                </option>

              </select>

            </label>

          </div>


          ${
            edit

              ? ''

              : `

                <div class="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">

                  <label class="flex items-start gap-3">

                    <input
                      id="createAccount"
                      name="createAccount"
                      type="checkbox"
                      value="true"
                      class="mt-1"
                    >

                    <span>

                      <span class="font-black text-indigo-900">
                        Buat akun login karyawan
                      </span>

                      <span class="block text-xs text-indigo-700 mt-1">
                        Karyawan dapat login, melihat saldo dan riwayat, lalu mengajukan cuti sendiri.
                      </span>

                    </span>

                  </label>


                  <div
                    id="accountFields"
                    class="hidden grid sm:grid-cols-2 gap-4 mt-4"
                  >

                    <label>

                      <span class="text-sm font-bold">
                        Username
                      </span>

                      <input
                        name="username"
                        class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 bg-white"
                        placeholder="contoh: andi"
                      >

                    </label>


                    <label>

                      <span class="text-sm font-bold">
                        Password sementara
                      </span>

                      <input
                        name="password"
                        type="password"
                        class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 bg-white"
                        placeholder="minimal 8 karakter"
                      >

                    </label>

                  </div>

                </div>

              `
          }


          <div class="flex justify-end gap-2 pt-2">

            <button
              type="button"
              onclick="closeModal()"
              class="px-5 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>


            <button
              id="saveEmployee"
              class="px-6 py-3 rounded-xl bg-slate-950 text-white font-bold flex items-center gap-2"
            >

              <i
                data-lucide="save"
                class="w-4"
              ></i>

              ${
                edit
                  ? 'Simpan Perubahan'
                  : 'Simpan Karyawan'
              }

            </button>

          </div>

        </form>

      </div>

    </div>

  `);


  if (!edit) {

    $('createAccount').onchange =
      e => {

        $('accountFields')
          .classList
          .toggle(
            'hidden',
            !e.target.checked
          );

      };

  }


  $('employeeForm').onsubmit =
    async ev => {

      ev.preventDefault();


      const b =
        $('saveEmployee');


      await runWithButton(
        b,

        async () => {

          try {

            const payload =
              Object.fromEntries(
                new FormData(
                  ev.target
                ).entries()
              );


            if (edit) {

              await api(
                'updateEmployee',
                payload
              );

            }

            else {

              payload.createAccount =
                Boolean(
                  $('createAccount')
                    ?.checked
                );


              await api(
                'createEmployeeWithAccount',
                payload
              );

            }


            toast(
              edit
                ? 'Data karyawan diperbarui'
                : 'Karyawan berhasil dibuat'
            );


            closeModal();

            await loadData();

            renderPage();

          }

          catch (e) {

            toast(
              e.message,
              'error'
            );

          }

        },

        edit
          ? 'Menyimpan...'
          : 'Membuat...'
      );

    };

}


/* ==================================================
   EMPLOYEE PROFILE
================================================== */

function openEmployeeProfile(id) {

  const e =
    employeeById(id);


  if (!e) return;


  const history =
    state.data.leaves
      .filter(
        l =>
          String(
            l.employeeId
          ) === String(id)
      )
      .reverse();


  const linked =
    state.data.users.find(
      u =>
        String(
          u.employeeId
        ) === String(id)
    );


  openModal(`

    <div class="modal-backdrop fixed inset-0 z-50 overflow-auto p-4">

      <div class="bg-white rounded-[2rem] max-w-5xl mx-auto shadow-soft my-4 overflow-hidden">

        <div class="bg-slate-950 text-white p-6 sm:p-8 relative">

          <button
            onclick="closeModal()"
            class="absolute right-5 top-5 p-2 rounded-xl bg-white/10 hover:bg-white/20"
          >

            <i
              data-lucide="x"
            ></i>

          </button>


          <div class="flex flex-col sm:flex-row gap-5 sm:items-center">

            <div class="w-20 h-20 rounded-3xl bg-white/10 border border-white/10 grid place-items-center text-2xl font-black">

              ${initials(
                e.Nama
              )}

            </div>


            <div>

              <div class="text-indigo-300 text-xs uppercase tracking-[.16em] font-black">
                Profil Karyawan
              </div>


              <h2 class="text-3xl font-black mt-1">
                ${esc(e.Nama)}
              </h2>


              <div class="text-slate-300 mt-1">
                ${esc(e.Jabatan)}
                ·
                ${esc(e.Departemen)}
              </div>


              <div class="mt-3">
                ${badge(e.Status)}
              </div>

            </div>

          </div>

        </div>


        <div class="p-6 sm:p-8">

          <div class="grid sm:grid-cols-3 gap-4">

            ${profileStat(
              'calendar-days',
              'Hak Cuti',
              e['Hak Cuti'] ?? 0,
              'hari'
            )}

            ${profileStat(
              'history',
              'Sudah Dipakai',
              e['Cuti Terpakai'] ?? 0,
              'hari'
            )}

            ${profileStat(
              'sparkles',
              'Sisa Cuti',
              e['Sisa Cuti'] ?? 0,
              'hari'
            )}

          </div>


          <div class="grid xl:grid-cols-2 gap-6 mt-7">

            <div>

              <h3 class="font-black text-lg">
                Informasi data diri
              </h3>


              <div class="mt-4 grid sm:grid-cols-2 gap-4">

                ${infoBox(
                  'badge',
                  'ID Karyawan',
                  e['ID Karyawan']
                )}

                ${infoBox(
                  'briefcase-business',
                  'Jabatan',
                  e.Jabatan
                )}

                ${infoBox(
                  'building-2',
                  'Departemen',
                  e.Departemen
                )}

                ${infoBox(
                  'calendar-days',
                  'Mulai bekerja',
                  fmtDate(
                    e[
                      'Tanggal Mulai Masa Kerja'
                    ]
                  )
                )}

                ${infoBox(
                  'clock-3',
                  'Masa kerja',
                  `${e['Masa Kerja Tahun'] || 0} tahun ${e['Masa Kerja Bulan'] || 0} bulan`
                )}

                ${infoBox(
                  'user-round-check',
                  'Akun login',
                  linked
                    ? `${linked.username} · ${linked.status}`
                    : 'Belum dibuat'
                )}

              </div>

            </div>


            <div>

              <div class="flex justify-between items-center">

                <h3 class="font-black text-lg">
                  Riwayat cuti
                </h3>

                <span class="text-xs text-slate-400">
                  ${history.length}
                  pengajuan
                </span>

              </div>


              <div class="mt-4 rounded-2xl border border-slate-100 overflow-hidden">

                ${
                  history.length

                    ? history
                        .slice(0, 8)
                        .map(
                          l => `

                            <div class="p-4 border-b last:border-b-0 border-slate-100">

                              <div class="flex items-center justify-between gap-3">

                                <div>

                                  <div class="font-bold text-sm">
                                    ${esc(l.type)}
                                  </div>

                                  <div class="text-xs text-slate-400 mt-1">

                                    ${fmtDate(
                                      l.startDate
                                    )}

                                    –

                                    ${fmtDate(
                                      l.endDate
                                    )}

                                    ·

                                    ${esc(l.days)}
                                    hari

                                  </div>

                                </div>

                                ${badge(
                                  l.status
                                )}

                              </div>

                            </div>

                          `
                        )
                        .join('')

                    : emptyState(
                        'calendar-x',
                        'Belum ada riwayat'
                      )

                }

              </div>

            </div>

          </div>


          <div class="mt-7 flex justify-end gap-2">

            <button
              id="profileEdit"
              class="px-5 py-3 rounded-xl bg-slate-950 text-white font-bold"
            >
              Edit Karyawan
            </button>


            <button
              onclick="closeModal()"
              class="px-5 py-3 rounded-xl bg-slate-100 font-bold"
            >
              Tutup
            </button>

          </div>

        </div>

      </div>

    </div>

  `);


  $('profileEdit').onclick =
    () => {

      closeModal();

      openEmployeeModal(e);

    };


  lucide.createIcons();
}


function profileStat(
  icon,
  label,
  value,
  unit
) {

  return `

    <div class="rounded-2xl bg-slate-50 p-5">

      <div class="w-10 h-10 rounded-xl bg-white text-indigo-600 grid place-items-center shadow-sm">

        <i
          data-lucide="${icon}"
          class="w-5"
        ></i>

      </div>


      <div class="text-3xl font-black mt-4">
        ${esc(value)}
      </div>


      <div class="font-bold mt-1">
        ${label}
      </div>


      <div class="text-xs text-slate-400 mt-1">
        ${unit}
      </div>

    </div>

  `;
}


function infoBox(
  icon,
  label,
  value
) {

  return `

    <div class="rounded-2xl border border-slate-100 p-4">

      <div class="flex items-center gap-2 text-xs text-slate-400">

        <i
          data-lucide="${icon}"
          class="w-4"
        ></i>

        ${label}

      </div>


      <div class="font-bold mt-2">
        ${value || '-'}
      </div>

    </div>

  `;
}


function infoLine(
  icon,
  label,
  value
) {

  return `

    <div class="flex items-start gap-3">

      <div class="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 grid place-items-center shrink-0">

        <i
          data-lucide="${icon}"
          class="w-4"
        ></i>

      </div>


      <div>

        <div class="text-xs text-slate-400">
          ${label}
        </div>

        <div class="font-bold mt-1">
          ${value}
        </div>

      </div>

    </div>

  `;
}


/* ==================================================
   EMPLOYEE ACTIONS
================================================== */

async function deactivateOne(id) {

  if (
    !confirm(
      'Nonaktifkan karyawan ini? Akun login terkait juga akan dinonaktifkan dan riwayat cuti tetap disimpan.'
    )
  ) {

    return;

  }


  showLoader(
    'Menonaktifkan karyawan...'
  );


  try {

    await api(
      'deactivateEmployee',
      {
        employeeId: id
      }
    );


    state.selectedEmployees
      .delete(
        String(id)
      );


    toast(
      'Karyawan berhasil dinonaktifkan'
    );


    await loadData(false);

    renderPage();

  }

  catch (e) {

    toast(
      e.message,
      'error'
    );

  }

  finally {

    hideLoader();

  }
}


async function bulkDeactivate() {

  const ids =
    [...state.selectedEmployees];


  if (!ids.length) {
    return;
  }


  if (
    !confirm(
      `Nonaktifkan ${ids.length} karyawan terpilih?`
    )
  ) {

    return;

  }


  showLoader(
    'Memproses karyawan...'
  );


  try {

    for (
      const id of ids
    ) {

      await api(
        'deactivateEmployee',
        {
          employeeId: id
        }
      );

    }


    state.selectedEmployees
      .clear();


    toast(
      `${ids.length} karyawan berhasil dinonaktifkan`
    );


    await loadData(false);

    renderPage();

  }

  catch (e) {

    toast(
      e.message,
      'error'
    );

  }

  finally {

    hideLoader();

  }
}


/* ==================================================
   HOLIDAYS
================================================== */

function renderHolidays() {

  setHeader(
    'Hari Libur',
    'Kelola tanggal merah yang menjadi referensi aturan cuti'
  );


  const h =
    state.data.holidays || [];


  $('content').innerHTML = `

    <div class="fade-in">

      <div class="flex justify-between items-end mb-5">

        <div>

          <h2 class="text-2xl font-black">
            Hari Libur
          </h2>

          <p class="text-sm text-slate-400 mt-1">
            Tanggal yang aktif akan ikut diperiksa sistem.
          </p>

        </div>


        <button
          id="addHoliday"
          class="rounded-xl bg-slate-950 text-white px-4 py-2.5 font-bold flex items-center gap-2"
        >

          <i
            data-lucide="calendar-plus"
            class="w-4"
          ></i>

          Tambah Hari Libur

        </button>

      </div>


      <div class="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">

        ${
          h.length

            ? `

              <div class="overflow-auto">

                <table class="w-full text-sm">

                  <thead class="bg-slate-50">

                    <tr>

                      <th class="text-left px-5 py-3">
                        Tanggal
                      </th>

                      <th class="text-left px-5 py-3">
                        Keterangan
                      </th>

                      <th class="text-left px-5 py-3">
                        Jenis
                      </th>

                      <th class="text-left px-5 py-3">
                        Status
                      </th>

                      <th class="text-right px-5 py-3">
                        Aksi
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    ${h
                      .map(
                        x => `

                          <tr class="border-t table-row">

                            <td class="px-5 py-4 font-bold">
                              ${fmtDate(
                                x.Tanggal
                              )}
                            </td>

                            <td class="px-5 py-4">
                              ${esc(
                                x.Keterangan
                              )}
                            </td>

                            <td class="px-5 py-4">
                              ${esc(
                                x.Jenis ||
                                '-'
                              )}
                            </td>

                            <td class="px-5 py-4">
                              ${badge(
                                x.Status
                              )}
                            </td>

                            <td class="px-5 py-4 text-right">

                              <button
                                data-holiday-id="${esc(x.ID)}"
                                data-status="${esc(x.Status)}"
                                class="text-xs font-bold text-indigo-600"
                              >

                                ${
                                  String(
                                    x.Status
                                  ).toLowerCase() ===
                                  'aktif'

                                    ? 'Nonaktifkan'

                                    : 'Aktifkan'
                                }

                              </button>

                            </td>

                          </tr>

                        `
                      )
                      .join('')}

                  </tbody>

                </table>

              </div>

            `

            : emptyState(
                'calendar-off',
                'Belum ada hari libur'
              )
        }

      </div>

    </div>

  `;


  $('addHoliday').onclick =
    openHolidayModal;


  document
    .querySelectorAll(
      '[data-holiday-id]'
    )
    .forEach(
      b =>
        b.onclick =
          async () => {

            try {

              await api(
                'updateHolidayStatus',
                {
                  id:
                    b.dataset
                      .holidayId,

                  status:
                    String(
                      b.dataset.status
                    ).toLowerCase() ===
                    'aktif'
                      ? 'Nonaktif'
                      : 'Aktif'
                }
              );


              toast(
                'Status hari libur diperbarui'
              );


              await loadData();

              renderPage();

            }

            catch (e) {

              toast(
                e.message,
                'error'
              );

            }

          }
    );


  lucide.createIcons();
}


function openHolidayModal() {

  openModal(`

    <div class="modal-backdrop fixed inset-0 z-50 grid place-items-center p-4">

      <div class="bg-white rounded-3xl w-full max-w-lg shadow-soft p-7">

        <div class="flex justify-between">

          <div>

            <h3 class="text-xl font-black">
              Tambah Hari Libur
            </h3>

            <p class="text-sm text-slate-400 mt-1">
              Masukkan tanggal yang perlu diperlakukan sebagai tanggal merah.
            </p>

          </div>


          <button
            onclick="closeModal()"
          >

            <i
              data-lucide="x"
            ></i>

          </button>

        </div>


        <form
          id="holidayForm"
          class="mt-6 space-y-4"
        >

          <input
            name="tanggal"
            type="date"
            class="w-full rounded-xl border px-4 py-3"
            required
          >


          <input
            name="keterangan"
            placeholder="Keterangan"
            class="w-full rounded-xl border px-4 py-3"
            required
          >


          <select
            name="jenis"
            class="w-full rounded-xl border px-4 py-3"
          >

            <option value="Perusahaan">
              Perusahaan
            </option>

            <option value="Nasional">
              Nasional
            </option>

          </select>


          <button
            class="w-full rounded-xl bg-slate-950 text-white py-3 font-bold"
          >
            Simpan
          </button>

        </form>

      </div>

    </div>

  `);


  $('holidayForm').onsubmit =
    async e => {

      e.preventDefault();


      const b =
        e.target.querySelector(
          'button'
        );


      await runWithButton(
        b,

        async () => {

          try {

            await api(
              'createHoliday',
              Object.fromEntries(
                new FormData(
                  e.target
                ).entries()
              )
            );


            toast(
              'Hari libur berhasil ditambahkan'
            );


            closeModal();

            await loadData();

            renderPage();

          }

          catch (x) {

            toast(
              x.message,
              'error'
            );

          }

        },

        'Menyimpan...'
      );

    };


  lucide.createIcons();
}


/* ==================================================
   USERS
================================================== */

function renderUsers() {

  setHeader(
    'Pengguna',
    'Kelola akun, mapping karyawan, dan akses login'
  );


  const users =
    state.data.users || [];


  $('content').innerHTML = `

    <div class="fade-in">

      <div class="flex justify-between items-end mb-5">

        <div>

          <h2 class="text-2xl font-black">
            Pengguna
          </h2>

          <p class="text-sm text-slate-400 mt-1">
            ${users.length}
            akun terdaftar.
          </p>

        </div>


        <button
          id="newUser"
          class="rounded-xl bg-slate-950 text-white px-4 py-2.5 font-bold flex items-center gap-2"
        >

          <i
            data-lucide="user-round-plus"
            class="w-4"
          ></i>

          Tambah Pengguna

        </button>

      </div>


      <div class="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">

        ${
          users.length

            ? `

              <div class="overflow-auto">

                <table class="w-full text-sm">

                  <thead class="bg-slate-50">

                    <tr>

                      <th class="text-left px-5 py-3">
                        Pengguna
                      </th>

                      <th class="text-left px-5 py-3">
                        Role
                      </th>

                      <th class="text-left px-5 py-3">
                        Karyawan
                      </th>

                      <th class="text-left px-5 py-3">
                        Status
                      </th>

                      <th class="text-right px-5 py-3">
                        Aksi
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    ${users
                      .map(
                        u => `

                          <tr class="border-t table-row">

                            <td class="px-5 py-4">

                              <div class="flex items-center gap-3">

                                <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center font-black text-xs">

                                  ${initials(
                                    u.nama
                                  )}

                                </div>


                                <div>

                                  <div class="font-bold">
                                    ${esc(u.nama)}
                                  </div>

                                  <div class="text-xs text-slate-400 mt-1">
                                    @${esc(u.username)}
                                  </div>

                                </div>

                              </div>

                            </td>


                            <td class="px-5 py-4">
                              ${badge(
                                roleLabel(
                                  u.role
                                )
                              )}
                            </td>


                            <td class="px-5 py-4">
                              ${esc(
                                employeeById(
                                  u.employeeId
                                )?.Nama ||
                                u.employeeId ||
                                'Belum terhubung'
                              )}
                            </td>


                            <td class="px-5 py-4">
                              ${badge(
                                u.status
                              )}
                            </td>


                            <td class="px-5 py-4 text-right">

                              <button
                                data-user-id="${esc(u.id)}"
                                class="px-3 py-2 rounded-xl bg-slate-100 font-bold text-xs hover:bg-indigo-50 hover:text-indigo-700"
                              >
                                Kelola
                              </button>

                            </td>

                          </tr>

                        `
                      )
                      .join('')}

                  </tbody>

                </table>

              </div>

            `

            : emptyState(
                'shield-user',
                'Belum ada pengguna'
              )
        }

      </div>

    </div>

  `;


  $('newUser').onclick =
    openUserModal;


  document
    .querySelectorAll(
      '[data-user-id]'
    )
    .forEach(
      b =>
        b.onclick =
          () =>
            openUserManageModal(
              b.dataset.userId
            )
    );


  lucide.createIcons();
}


function openUserModal() {

  openModal(`

    <div class="modal-backdrop fixed inset-0 z-50 grid place-items-center p-4">

      <div class="bg-white rounded-3xl w-full max-w-lg shadow-soft p-7">

        <div class="flex justify-between">

          <div>

            <h3 class="text-xl font-black">
              Tambah Pengguna
            </h3>

            <p class="text-sm text-slate-400 mt-1">
              Untuk HRD, BM, Admin, atau Karyawan.
            </p>

          </div>


          <button
            onclick="closeModal()"
          >

            <i
              data-lucide="x"
            ></i>

          </button>

        </div>


        <form
          id="userForm"
          class="mt-6 space-y-4"
        >

          <input
            name="nama"
            placeholder="Nama lengkap"
            class="w-full rounded-xl border px-4 py-3"
            required
          >


          <input
            name="username"
            placeholder="Username"
            class="w-full rounded-xl border px-4 py-3"
            required
          >


          <input
            name="password"
            type="password"
            placeholder="Password minimal 8 karakter"
            class="w-full rounded-xl border px-4 py-3"
            required
          >


          <select
            name="role"
            class="w-full rounded-xl border px-4 py-3"
          >

            <option>
              HRD
            </option>

            <option>
              BM
            </option>

            <option>
              ADMIN
            </option>

            <option>
              KARYAWAN
            </option>

            <option>
              OWNER
            </option>

          </select>


          <input
            type="hidden"
            name="status"
            value="AKTIF"
          >


          <button
            class="w-full rounded-xl bg-slate-950 text-white py-3 font-bold"
          >
            Buat Akun
          </button>

        </form>

      </div>

    </div>

  `);


  $('userForm').onsubmit =
    async e => {

      e.preventDefault();


      const b =
        e.target.querySelector(
          'button'
        );


      await runWithButton(
        b,

        async () => {

          try {

            await api(
              'createUser',
              Object.fromEntries(
                new FormData(
                  e.target
                ).entries()
              )
            );


            toast(
              'Pengguna berhasil dibuat'
            );


            closeModal();

            await loadData();

            renderPage();

          }

          catch (x) {

            toast(
              x.message,
              'error'
            );

          }

        },

        'Membuat...'
      );

    };


  lucide.createIcons();
}


function openUserManageModal(id) {

  const u =
    state.data.users.find(
      x =>
        String(x.id) ===
        String(id)
    );


  if (!u) return;


  const emps =
    state.data.employees
      .filter(e => active(e));


  openModal(`

    <div class="modal-backdrop fixed inset-0 z-50 grid place-items-center p-4">

      <div class="bg-white rounded-3xl w-full max-w-lg shadow-soft p-7">

        <div class="flex justify-between">

          <div>

            <h3 class="text-xl font-black">
              Kelola ${esc(u.nama)}
            </h3>

            <p class="text-sm text-slate-400 mt-1">
              @${esc(u.username)}
              ·
              ${roleLabel(u.role)}
            </p>

          </div>


          <button
            onclick="closeModal()"
          >

            <i
              data-lucide="x"
            ></i>

          </button>

        </div>


        <div class="mt-6 space-y-4">

          <label class="block">

            <span class="text-sm font-bold">
              Hubungkan ke karyawan
            </span>

            <select
              id="mapEmployee"
              class="mt-2 w-full rounded-xl border px-4 py-3"
            >

              <option value="">
                Tidak terhubung
              </option>

              ${emps
                .map(
                  e => `

                    <option
                      value="${esc(
                        e['ID Karyawan']
                      )}"
                      ${
                        String(
                          e['ID Karyawan']
                        ) ===
                        String(
                          u.employeeId
                        )
                          ? 'selected'
                          : ''
                      }
                    >
                      ${esc(e.Nama)}
                    </option>

                  `
                )
                .join('')}

            </select>

          </label>


          <label class="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">

            <input
              id="permCreate"
              type="checkbox"
              ${
                u.canCreateLeaveForOthers
                  ? 'checked'
                  : ''
              }
            >

            <span class="text-sm font-semibold">
              Boleh membuat cuti untuk orang lain
            </span>

          </label>


          <label class="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">

            <input
              id="permView"
              type="checkbox"
              ${
                u.canViewAllLeaves
                  ? 'checked'
                  : ''
              }
            >

            <span class="text-sm font-semibold">
              Boleh melihat semua data cuti
            </span>

          </label>


          <div class="border-t pt-4">

            <label class="text-sm font-bold">
              Status akun
            </label>

            <select
              id="userStatus"
              class="mt-2 w-full rounded-xl border px-4 py-3"
            >

              <option
                value="AKTIF"
                ${
                  String(
                    u.status
                  ).toUpperCase() ===
                  'AKTIF'
                    ? 'selected'
                    : ''
                }
              >
                Aktif
              </option>

              <option
                value="NONAKTIF"
                ${
                  String(
                    u.status
                  ).toUpperCase() !==
                  'AKTIF'
                    ? 'selected'
                    : ''
                }
              >
                Nonaktif
              </option>

            </select>

          </div>


          <button
            id="resetPass"
            class="w-full rounded-xl bg-slate-100 py-3 font-bold"
          >
            Reset Password
          </button>


          <button
            id="saveUserManage"
            class="w-full rounded-xl bg-slate-950 text-white py-3 font-bold"
          >
            Simpan perubahan
          </button>

        </div>

      </div>

    </div>

  `);


  $('saveUserManage').onclick =
    async () => {

      await runWithButton(
        $('saveUserManage'),

        async () => {

          try {

            if (
              $('mapEmployee').value
            ) {

              await api(
                'setUserEmployee',
                {
                  userId: id,

                  employeeId:
                    $('mapEmployee')
                      .value
                }
              );

            }


            await api(
              'setUserPermission',
              {
                userId: id,
                permission:
                  'CAN_CREATE_LEAVE_FOR_OTHERS',
                value:
                  $('permCreate')
                    .checked
              }
            );


            await api(
              'setUserPermission',
              {
                userId: id,
                permission:
                  'CAN_VIEW_ALL_LEAVES',
                value:
                  $('permView')
                    .checked
              }
            );


            await api(
              'updateUserStatus',
              {
                userId: id,
                status:
                  $('userStatus')
                    .value
              }
            );


            toast(
              'Pengguna diperbarui'
            );


            closeModal();

            await loadData();

            renderPage();

          }

          catch (e) {

            toast(
              e.message,
              'error'
            );

          }

        },

        'Menyimpan...'
      );

    };


  $('resetPass').onclick =
    async () => {

      const p =
        prompt(
          'Masukkan password baru minimal 8 karakter:'
        );


      if (!p) return;


      try {

        await api(
          'resetUserPassword',
          {
            userId: id,
            password: p
          }
        );


        toast(
          'Password berhasil direset'
        );

      }

      catch (e) {

        toast(
          e.message,
          'error'
        );

      }

    };


  lucide.createIcons();
}


/* ==================================================
   SETTINGS
================================================== */

function renderSettings() {

  setHeader(
    'Pengaturan',
    'Aturan bisnis yang dapat diubah Owner'
  );


  const s =
    state.data.settings;


  const fields = [

    [
      'MIN_HARI_PENGAJUAN',
      'Minimal H- pengajuan',
      'number'
    ],

    [
      'MAX_HARI_CUTI',
      'Maksimal cuti normal',
      'number'
    ],

    [
      'HAK_CUTI_1_TAHUN',
      'Hak cuti 1–<2 tahun',
      'number'
    ],

    [
      'HAK_CUTI_2_TAHUN',
      'Hak cuti 2–<3 tahun',
      'number'
    ],

    [
      'HAK_CUTI_3_TAHUN',
      'Hak cuti ≥3 tahun',
      'number'
    ]

  ];


  $('content').innerHTML = `

    <div class="fade-in max-w-5xl">

      <div class="bg-white rounded-3xl border border-slate-100 shadow-card p-6 sm:p-8">

        <div class="grid sm:grid-cols-2 gap-5">

          ${fields
            .map(
              ([k, l, t]) => `

                <label>

                  <span class="text-sm font-bold">
                    ${l}
                  </span>

                  <input
                    data-setting="${k}"
                    type="${t}"
                    value="${esc(
                      s[k] ?? ''
                    )}"
                    class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                  >

                </label>

              `
            )
            .join('')}


          <label>

            <span class="text-sm font-bold">
              Management approver
            </span>

            <select
              data-setting="MANAGEMENT_APPROVER_ROLE"
              class="mt-2 w-full rounded-xl border px-4 py-3"
            >

              <option
                ${
                  s.MANAGEMENT_APPROVER_ROLE ===
                  'AUTO'
                    ? 'selected'
                    : ''
                }
              >
                AUTO
              </option>

              <option
                ${
                  s.MANAGEMENT_APPROVER_ROLE ===
                  'HRD'
                    ? 'selected'
                    : ''
                }
              >
                HRD
              </option>

              <option
                ${
                  s.MANAGEMENT_APPROVER_ROLE ===
                  'BM'
                    ? 'selected'
                    : ''
                }
              >
                BM
              </option>

              <option
                ${
                  s.MANAGEMENT_APPROVER_ROLE ===
                  'OWNER'
                    ? 'selected'
                    : ''
                }
              >
                OWNER
              </option>

            </select>

          </label>


          <label>

            <span class="text-sm font-bold">
              Pengecualian dekat hari libur
            </span>

            <select
              data-setting="ALLOW_HOLIDAY_ADJACENCY_EXCEPTION"
              class="mt-2 w-full rounded-xl border px-4 py-3"
            >

              <option
                value="true"
                ${
                  String(
                    s.ALLOW_HOLIDAY_ADJACENCY_EXCEPTION
                  ) !== 'false'
                    ? 'selected'
                    : ''
                }
              >
                Boleh, perlu Owner
              </option>

              <option
                value="false"
                ${
                  String(
                    s.ALLOW_HOLIDAY_ADJACENCY_EXCEPTION
                  ) === 'false'
                    ? 'selected'
                    : ''
                }
              >
                Tidak boleh
              </option>

            </select>

          </label>


          <label>

            <span class="text-sm font-bold">
              Pengecualian overlap
            </span>

            <select
              data-setting="ALLOW_OVERLAP_EXCEPTION"
              class="mt-2 w-full rounded-xl border px-4 py-3"
            >

              <option
                value="true"
                ${
                  String(
                    s.ALLOW_OVERLAP_EXCEPTION
                  ) !== 'false'
                    ? 'selected'
                    : ''
                }
              >
                Boleh, perlu Owner
              </option>

              <option
                value="false"
                ${
                  String(
                    s.ALLOW_OVERLAP_EXCEPTION
                  ) === 'false'
                    ? 'selected'
                    : ''
                }
              >
                Tidak boleh
              </option>

            </select>

          </label>

        </div>


        <div class="mt-7 flex justify-end">

          <button
            id="saveSettings"
            class="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 font-bold"
          >
            Simpan Pengaturan
          </button>

        </div>

      </div>

    </div>

  `;


  $('saveSettings').onclick =
    async () => {

      await runWithButton(
        $('saveSettings'),

        async () => {

          try {

            for (
              const el of
              document.querySelectorAll(
                '[data-setting]'
              )
            ) {

              await api(
                'updateSetting',
                {
                  setting:
                    el.dataset.setting,

                  value:
                    el.value
                }
              );

            }


            toast(
              'Pengaturan berhasil disimpan'
            );


            await loadData();

            renderPage();

          }

          catch (e) {

            toast(
              e.message,
              'error'
            );

          }

        },

        'Menyimpan...'
      );

    };
}


/* ==================================================
   LOGIN
================================================== */

$('loginForm').onsubmit =
  async e => {

    e.preventDefault();


    await runWithButton(
      $('loginBtn'),

      async () => {

        try {

          showLoader(
            'Membuka workspace...'
          );


          const username =
            $('loginUsername').value;


          const password =
            $('loginPassword').value;


          console.log(
            'LOGIN SUBMIT:',
            {
              username,
              passwordLength:
                password.length
            }
          );


          /*
           * Login sengaja tidak
           * menggunakan token lama.
           */

          const r =
            await api(
              'login',
              {
                username,
                password
              },
              ''
            );


          console.log(
            'LOGIN RESULT:',
            r
          );


          saveSession(r);


          state.page =
            'dashboard';


          /*
           * Kalau login berhasil tetapi
           * loadData gagal, console akan
           * menunjukkan action mana yang
           * bermasalah.
           */

          await loadData(false);


          renderPage();


          toast(
            'Login berhasil'
          );

        }

        catch (err) {

          console.error(
            'LOGIN / INITIAL LOAD ERROR:',
            err
          );


          toast(
            err.message,
            'error'
          );

        }

        finally {

          hideLoader();

        }

      },

      'Masuk...'
    );

  };


/* ==================================================
   PASSWORD TOGGLE
================================================== */

$('togglePassword').onclick =
  () => {

    $('loginPassword').type =
      $('loginPassword').type ===
      'password'
        ? 'text'
        : 'password';


    lucide.createIcons();
  };


/* ==================================================
   LOGOUT
================================================== */

$('logoutBtn').onclick =
  () => {

    clearSession();


    state.data = {

      employees: [],
      leaves: [],
      approvals: [],
      holidays: [],
      users: [],
      settings: {}

    };


    renderPage();
  };


/* ==================================================
   REFRESH
================================================== */

$('refreshBtn').onclick =
  async () => {

    try {

      await loadData();

      renderPage();

      toast(
        'Data diperbarui'
      );

    }

    catch (e) {

      console.error(
        'REFRESH ERROR:',
        e
      );

      toast(
        e.message,
        'error'
      );

    }

  };


/* ==================================================
   PROFILE
================================================== */

$('profileBtn').onclick =
  () => {

    const e =
      getSelfEmployee();


    if (e) {

      openEmployeeProfile(
        e['ID Karyawan']
      );

    }

    else {

      toast(
        'Profil karyawan belum terhubung',
        'error'
      );

    }

  };


/* ==================================================
   SIDEBAR
================================================== */

$('openSidebar').onclick =
  openSidebar;


$('closeSidebar').onclick =
  closeSidebar;


$('mobileBackdrop').onclick =
  closeSidebar;


/* ==================================================
   INITIAL LOAD
================================================== */

(async () => {

  lucide.createIcons();


  /*
   * Kalau masih punya session lama,
   * validasi session ke backend.
   */

  if (
    state.token &&
    state.user
  ) {

    try {

      console.log(
        'RESTORING SESSION...'
      );


      const r =
        await api(
          'getMe'
        );


      state.user =
        r.user;


      localStorage.setItem(
        'cuti_user',
        JSON.stringify(
          state.user
        )
      );


      await loadData();


      renderPage();

    }

    catch (e) {

      console.error(
        'SESSION RESTORE ERROR:',
        e
      );


      clearSession();

      renderPage();

    }

  }

  else {

    renderPage();

  }

})();