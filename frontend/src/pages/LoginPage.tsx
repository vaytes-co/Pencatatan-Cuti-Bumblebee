import { useState } from 'react'
import { motion } from 'motion/react'
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setIsLoading(true)

    // Simulasi proses login
    setTimeout(() => {
      setIsLoading(false)
    }, 1200)
  }

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-[#f7f8fc]">
      <main className="mx-auto grid min-h-[100dvh] max-w-[1500px] lg:grid-cols-[1.12fr_0.88fr]">

        {/* =====================================================
            LEFT SIDE
        ====================================================== */}
        <section className="relative flex items-center px-6 py-8 sm:px-10 lg:px-14 xl:px-20">

          {/* Decorative background */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-200/30 blur-3xl" />

            <div className="absolute bottom-[-100px] left-[35%] h-72 w-72 rounded-full bg-blue-200/25 blur-3xl" />

            <div className="absolute right-[5%] top-[15%] h-40 w-40 rounded-full bg-cyan-200/20 blur-3xl" />

            <div
              className="absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)',
                backgroundSize: '42px 42px',
                maskImage:
                  'linear-gradient(to bottom right, black, transparent 70%)',
              }}
            />
          </div>

          <div className="relative z-10 w-full max-w-2xl">

            {/* Brand */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
                <Sparkles size={20} strokeWidth={2.2} />
              </div>

              <div>
                <p className="text-sm font-semibold tracking-wide text-slate-900">
                  Leave Management
                </p>

                <p className="text-xs text-slate-500">
                  Smart leave management system
                </p>
              </div>
            </motion.div>

            {/* Main Heading */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.05 }}
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/80 px-3.5 py-2 text-xs font-semibold text-violet-700 shadow-sm backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                Simple. Organized. Connected.
              </div>

              <h1 className="max-w-2xl text-4xl font-bold leading-[1.04] tracking-[-0.04em] text-slate-950 sm:text-5xl xl:text-[58px]">
                Kelola cuti tim
                <span className="block bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  tanpa ribet.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
                Kelola pengajuan, persetujuan, dan pencatatan cuti
                dalam satu sistem yang rapi, cepat, dan mudah digunakan.
              </p>
            </motion.div>

            {/* Feature Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.15 }}
              className="mt-8 grid max-w-2xl grid-cols-3 gap-3"
            >

              {/* Feature 1 */}
              <div className="group rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-500/10">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition-transform duration-300 group-hover:scale-110">
                  <Check size={18} strokeWidth={2.5} />
                </div>

                <p className="text-sm font-semibold text-slate-800">
                  Terorganisir
                </p>

                <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">
                  Data cuti lebih rapi
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform duration-300 group-hover:scale-110">
                  <Zap size={18} strokeWidth={2.5} />
                </div>

                <p className="text-sm font-semibold text-slate-800">
                  Lebih Cepat
                </p>

                <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">
                  Approval lebih mudah
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform duration-300 group-hover:scale-110">
                  <ShieldCheck size={18} strokeWidth={2.5} />
                </div>

                <p className="text-sm font-semibold text-slate-800">
                  Terpercaya
                </p>

                <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">
                  Akses sesuai role
                </p>
              </div>

            </motion.div>

            {/* Small bottom text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-6 flex items-center gap-2 text-xs text-slate-400"
            >
              <LockKeyhole size={13} />

              <span>
                Sistem internal dengan akses yang aman dan terkontrol
              </span>
            </motion.div>

          </div>
        </section>


        {/* =====================================================
            RIGHT SIDE
        ====================================================== */}
        <section className="relative flex items-center justify-center px-6 py-8 sm:px-10 lg:px-12">

          {/* Right background glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute right-[-100px] top-[10%] h-80 w-80 rounded-full bg-violet-200/30 blur-3xl" />

            <div className="absolute bottom-[-120px] left-[-80px] h-72 w-72 rounded-full bg-blue-200/25 blur-3xl" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="relative z-10 w-full max-w-md"
          >

            {/* Login Card */}
            <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.28)]">

              {/* Top Gradient */}
              <div className="h-1.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-500" />

              <div className="p-7 sm:p-8">

                {/* Header */}
                <div className="mb-7">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                    <LockKeyhole size={22} strokeWidth={2} />
                  </div>

                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    Selamat datang 👋
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Masuk ke akunmu untuk melanjutkan ke sistem.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-5">

                  {/* Username */}
                  <div>
                    <label
                      htmlFor="username"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Username
                    </label>

                    <input
                      id="username"
                      type="text"
                      placeholder="Masukkan username"
                      autoComplete="username"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label
                        htmlFor="password"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Password
                      </label>
                    </div>

                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Masukkan password"
                        autoComplete="current-password"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 pr-12 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        aria-label={
                          showPassword
                            ? 'Sembunyikan password'
                            : 'Tampilkan password'
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Login Button */}
                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: isLoading ? 1 : 1.01 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        Masuk ke Dashboard

                        <ArrowRight
                          size={17}
                          className="transition-transform duration-300 group-hover:translate-x-1"
                        />
                      </>
                    )}
                  </motion.button>

                </form>

                {/* Security Info */}
                <div className="mt-6 flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <div className="mt-0.5 text-emerald-500">
                    <ShieldCheck size={17} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      Akses aman
                    </p>

                    <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                      Pastikan username dan password kamu tidak dibagikan
                      kepada orang lain.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <p className="mt-5 text-center text-xs text-slate-400">
              © {new Date().getFullYear()} Leave Management System
            </p>

          </motion.div>
        </section>

      </main>
    </div>
  )
}

export default LoginPage