import { motion } from 'motion/react'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  Users,
} from 'lucide-react'

import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'

function DashboardPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px]">

      {/* =====================================================
          WELCOME HEADER
      ====================================================== */}
      <div className="mb-7 flex min-w-0 flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

        <div className="min-w-0">

          <p className="text-sm font-medium text-violet-600">
            Senang bertemu lagi 👋
          </p>

          <h2 className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
            Selamat datang, Vindra
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Berikut ringkasan aktivitas cuti dan tim hari ini.
          </p>

        </div>


        {/* Action */}
        <div className="shrink-0">
          <Button
            icon={<Plus size={17} />}
            className="w-full sm:w-auto"
          >
            Ajukan Cuti
          </Button>
        </div>

      </div>


      {/* =====================================================
          STAT CARDS
      ====================================================== */}
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* ===================================================
            CARD 1
        ==================================================== */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="min-w-0"
        >
          <Card className="relative h-full min-w-0 overflow-hidden">

            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-violet-100/60 blur-2xl" />

            <div className="relative min-w-0">

              <div className="flex min-w-0 items-start justify-between gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <CalendarDays size={19} />
                </div>

                <Badge variant="violet">
                  Tahun ini
                </Badge>

              </div>

              <p className="mt-5 text-sm text-slate-500">
                Sisa Cuti
              </p>

              <div className="mt-1 flex items-end gap-2">
                <span className="text-3xl font-bold tracking-tight text-slate-900">
                  12
                </span>

                <span className="mb-1 text-xs text-slate-400">
                  hari
                </span>
              </div>

              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[75%] rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" />
              </div>

              <p className="mt-2 truncate text-[11px] text-slate-400">
                4 hari telah digunakan
              </p>

            </div>

          </Card>
        </motion.div>


        {/* ===================================================
            CARD 2
        ==================================================== */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="min-w-0"
        >
          <Card className="h-full min-w-0">

            <div className="flex min-w-0 items-start justify-between gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileText size={19} />
              </div>

              <Badge variant="info">
                Digunakan
              </Badge>

            </div>

            <p className="mt-5 text-sm text-slate-500">
              Cuti Terpakai
            </p>

            <div className="mt-1 flex items-end gap-2">
              <span className="text-3xl font-bold tracking-tight text-slate-900">
                4
              </span>

              <span className="mb-1 text-xs text-slate-400">
                hari
              </span>
            </div>

            <p className="mt-4 truncate text-[11px] text-slate-400">
              Dari total hak cuti tahun ini
            </p>

          </Card>
        </motion.div>


        {/* ===================================================
            CARD 3
        ==================================================== */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="min-w-0"
        >
          <Card className="h-full min-w-0">

            <div className="flex min-w-0 items-start justify-between gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock3 size={19} />
              </div>

              <Badge variant="warning">
                Menunggu
              </Badge>

            </div>

            <p className="mt-5 text-sm text-slate-500">
              Pengajuan Menunggu
            </p>

            <div className="mt-1 flex items-end gap-2">
              <span className="text-3xl font-bold tracking-tight text-slate-900">
                2
              </span>

              <span className="mb-1 text-xs text-slate-400">
                pengajuan
              </span>
            </div>

            <p className="mt-4 truncate text-[11px] text-slate-400">
              Membutuhkan perhatian
            </p>

          </Card>
        </motion.div>


        {/* ===================================================
            CARD 4
        ==================================================== */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="min-w-0"
        >
          <Card className="h-full min-w-0">

            <div className="flex min-w-0 items-start justify-between gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Users size={19} />
              </div>

              <Badge variant="success">
                Aktif
              </Badge>

            </div>

            <p className="mt-5 text-sm text-slate-500">
              Total Karyawan
            </p>

            <div className="mt-1 flex items-end gap-2">
              <span className="text-3xl font-bold tracking-tight text-slate-900">
                24
              </span>

              <span className="mb-1 text-xs text-slate-400">
                orang
              </span>
            </div>

            <p className="mt-4 truncate text-[11px] text-slate-400">
              22 aktif · 2 nonaktif
            </p>

          </Card>
        </motion.div>

      </div>


      {/* =====================================================
          LOWER CONTENT
      ====================================================== */}
      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">

        {/* ===================================================
            RECENT LEAVE
        ==================================================== */}
        <Card
          padding="none"
          className="min-w-0 overflow-hidden"
        >

          <div className="flex min-w-0 items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">

            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-slate-900">
                Pengajuan Cuti Terbaru
              </h3>

              <p className="mt-0.5 truncate text-xs text-slate-400">
                Aktivitas pengajuan terakhir
              </p>
            </div>

            <button
              type="button"
              className="flex shrink-0 items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700"
            >
              <span className="hidden sm:inline">
                Lihat semua
              </span>

              <ArrowRight size={14} />
            </button>

          </div>


          <div className="divide-y divide-slate-100">

            {/* Item 1 */}
            <div className="flex min-w-0 items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xs font-bold text-violet-600">
                AR
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  Ahmad Rizky
                </p>

                <p className="truncate text-xs text-slate-400">
                  Cuti Tahunan · 12–14 Oktober 2026
                </p>
              </div>

              <Badge variant="warning">
                Menunggu
              </Badge>

            </div>


            {/* Item 2 */}
            <div className="flex min-w-0 items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-600">
                NS
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  Nabila Sari
                </p>

                <p className="truncate text-xs text-slate-400">
                  Cuti Tahunan · 19–20 Oktober 2026
                </p>
              </div>

              <Badge variant="success">
                Disetujui
              </Badge>

            </div>


            {/* Item 3 */}
            <div className="flex min-w-0 items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xs font-bold text-emerald-600">
                DF
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  Dimas Fajar
                </p>

                <p className="truncate text-xs text-slate-400">
                  Cuti Menikah · 26–30 Oktober 2026
                </p>
              </div>

              <Badge variant="success">
                Disetujui
              </Badge>

            </div>

          </div>

        </Card>


        {/* ===================================================
            RIGHT COLUMN
        ==================================================== */}
        <div className="min-w-0 space-y-5">

          {/* Upcoming */}
          <Card className="min-w-0">

            <div className="flex min-w-0 items-center justify-between gap-3">

              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-slate-900">
                  Agenda Mendatang
                </h3>

                <p className="mt-0.5 truncate text-xs text-slate-400">
                  Jadwal cuti terdekat
                </p>
              </div>

              <CalendarDays
                size={18}
                className="shrink-0 text-violet-500"
              />

            </div>


            <div className="mt-5 space-y-3">

              {/* Agenda 1 */}
              <div className="flex min-w-0 gap-3 rounded-xl bg-slate-50 p-3">

                <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-white shadow-sm">
                  <span className="text-[9px] font-bold uppercase text-violet-500">
                    Okt
                  </span>

                  <span className="text-sm font-bold text-slate-800">
                    12
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    Ahmad Rizky
                  </p>

                  <p className="truncate text-[11px] text-slate-400">
                    Cuti Tahunan · 3 hari
                  </p>
                </div>

              </div>


              {/* Agenda 2 */}
              <div className="flex min-w-0 gap-3 rounded-xl bg-slate-50 p-3">

                <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-white shadow-sm">
                  <span className="text-[9px] font-bold uppercase text-blue-500">
                    Okt
                  </span>

                  <span className="text-sm font-bold text-slate-800">
                    19
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    Nabila Sari
                  </p>

                  <p className="truncate text-[11px] text-slate-400">
                    Cuti Tahunan · 2 hari
                  </p>
                </div>

              </div>

            </div>

          </Card>


          {/* Approval */}
          <Card className="min-w-0 overflow-hidden border-0 bg-gradient-to-br from-violet-600 to-indigo-600 text-white">

            <div className="relative">

              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-xl" />

              <div className="relative">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                  <CheckCircle2 size={19} />
                </div>

                <p className="mt-4 text-xs font-medium text-violet-100">
                  Perlu perhatian
                </p>

                <h3 className="mt-1 text-2xl font-bold">
                  2 pengajuan
                </h3>

                <p className="mt-1 text-xs leading-5 text-violet-100">
                  menunggu persetujuan Management.
                </p>

                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-violet-700 transition-transform hover:translate-x-0.5"
                >
                  Periksa sekarang
                  <ArrowRight size={14} />
                </button>

              </div>

            </div>

          </Card>

        </div>

      </div>

    </div>
  )
}

export default DashboardPage