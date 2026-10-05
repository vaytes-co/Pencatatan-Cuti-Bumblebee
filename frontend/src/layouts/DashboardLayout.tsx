import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react'

import { NavLink, useLocation } from 'react-router-dom'

interface DashboardLayoutProps {
  children: ReactNode
}

interface NavigationItem {
  label: string
  path: string
  icon: ReactNode
}

const navigation: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard size={19} />,
  },
  {
    label: 'Pengajuan Cuti',
    path: '/leave',
    icon: <CalendarDays size={19} />,
  },
  {
    label: 'Persetujuan',
    path: '/approvals',
    icon: <ClipboardCheck size={19} />,
  },
  {
    label: 'Karyawan',
    path: '/employees',
    icon: <Users size={19} />,
  },
  {
    label: 'Laporan',
    path: '/reports',
    icon: <FileText size={19} />,
  },
  {
    label: 'Pengaturan',
    path: '/settings',
    icon: <Settings size={19} />,
  },
]

function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const location = useLocation()

  const currentPage = navigation.find(
    (item) => item.path === location.pathname,
  )

  const pageTitle = currentPage?.label ?? 'Dashboard'

  /*
   * collapsed hanya berlaku untuk desktop.
   *
   * Kalau sidebar sedang dibuka di mobile,
   * sidebar selalu dianggap full / tidak collapsed.
   */
  const sidebarCollapsed = collapsed && !mobileOpen

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f8fc] text-slate-900">

      {/* =====================================================
          MOBILE OVERLAY
      ====================================================== */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            type="button"
            aria-label="Tutup menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>


      {/* =====================================================
          SIDEBAR
      ====================================================== */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex flex-col
          border-r border-slate-200/80
          bg-white
          shadow-[10px_0_40px_-30px_rgba(15,23,42,0.2)]
          transition-all duration-300 ease-in-out

          ${
            sidebarCollapsed
              ? 'w-[84px]'
              : 'w-[260px]'
          }

          max-lg:w-[280px]

          ${
            mobileOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          }
        `}
      >

        {/* ===================================================
            SIDEBAR HEADER
        ==================================================== */}
        <div
          className={`
            relative
            flex h-[76px] shrink-0
            items-center
            border-b border-slate-100
            ${
              sidebarCollapsed
                ? 'justify-center px-3'
                : 'justify-between px-5'
            }
          `}
        >

          {/* Brand */}
          <div className="flex min-w-0 items-center gap-3">

            {/* Logo */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
              <CalendarDays
                size={20}
                strokeWidth={2}
              />
            </div>

            {/* Brand text */}
            {!sidebarCollapsed && (
              <div className="min-w-0 overflow-hidden whitespace-nowrap">
                <p className="truncate text-sm font-bold text-slate-900">
                  Leave Management
                </p>

                <p className="truncate text-[11px] text-slate-400">
                  Management System
                </p>
              </div>
            )}

          </div>


          {/* =================================================
              DESKTOP SIDEBAR TOGGLE
          ================================================== */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={
              collapsed
                ? 'Buka sidebar'
                : 'Tutup sidebar'
            }
            className="
              absolute
              right-0
              top-1/2
              z-20
              hidden
              h-7
              w-7
              translate-x-1/2
              -translate-y-1/2
              items-center
              justify-center
              rounded-full
              border
              border-slate-200
              bg-white
              text-slate-400
              shadow-[0_4px_12px_-4px_rgba(15,23,42,0.25)]
              transition-all
              duration-200
              hover:border-violet-200
              hover:bg-violet-50
              hover:text-violet-600
              hover:shadow-[0_6px_16px_-4px_rgba(124,58,237,0.2)]
              lg:flex
            "
          >
            {collapsed ? (
              <ChevronRight
                size={15}
                strokeWidth={2.5}
              />
            ) : (
              <ChevronLeft
                size={15}
                strokeWidth={2.5}
              />
            )}
          </button>


          {/* =================================================
              MOBILE CLOSE
          ================================================== */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-slate-400
              hover:bg-slate-100
              lg:hidden
            "
          >
            <X size={18} />
          </button>

        </div>


        {/* ===================================================
            NAVIGATION
        ==================================================== */}
        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-5">

          {!sidebarCollapsed && (
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
              Menu Utama
            </p>
          )}

          <div className="space-y-1.5">

            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `
                  group relative flex h-11
                  items-center gap-3
                  rounded-xl
                  text-sm font-medium
                  transition-all duration-200

                  ${
                    sidebarCollapsed
                      ? 'justify-center px-2'
                      : 'px-3'
                  }

                  ${
                    isActive
                      ? 'bg-violet-50 text-violet-700'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`
                        shrink-0 transition-colors
                        ${
                          isActive
                            ? 'text-violet-600'
                            : 'text-slate-400 group-hover:text-slate-600'
                        }
                      `}
                    >
                      {item.icon}
                    </span>

                    {!sidebarCollapsed && (
                      <span className="min-w-0 truncate">
                        {item.label}
                      </span>
                    )}

                    {isActive && (
                      <motion.span
                        layoutId="active-navigation"
                        className="absolute right-2 h-1.5 w-1.5 rounded-full bg-violet-600"
                      />
                    )}

                    {/* Tooltip hanya ketika desktop collapsed */}
                    {sidebarCollapsed && (
                      <span className="pointer-events-none absolute left-[calc(100%+10px)] z-[60] whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                        {item.label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}

          </div>

        </nav>


        {/* ===================================================
            SIDEBAR USER
        ==================================================== */}
        <div className="shrink-0 border-t border-slate-100 p-3">

          <div
            className={`
              rounded-2xl bg-slate-50
              ${
                sidebarCollapsed
                  ? 'p-2'
                  : 'p-3'
              }
            `}
          >

            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-bold text-white">
                VA
              </div>

              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    Vindra Arya
                  </p>

                  <p className="truncate text-[10px] text-slate-400">
                    Owner
                  </p>
                </div>
              )}

            </div>

          </div>

        </div>

      </aside>


      {/* =====================================================
          MAIN AREA
      ====================================================== */}
      <div
        className={`
          min-h-screen
          min-w-0
          transition-[margin-left]
          duration-300
          ease-in-out

          ${
            sidebarCollapsed
              ? 'lg:ml-[84px]'
              : 'lg:ml-[260px]'
          }
        `}
      >

        {/* ===================================================
            HEADER
        ==================================================== */}
        <header className="sticky top-0 z-30 flex h-[76px] min-w-0 items-center justify-between border-b border-slate-200/70 bg-[#f7f8fc]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">

          {/* Left */}
          <div className="flex min-w-0 items-center gap-3">

            {/* Mobile menu */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu"
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                text-slate-500
                shadow-sm
                transition-colors
                hover:text-slate-800
                lg:hidden
              "
            >
              <Menu size={19} />
            </button>


            {/* Page title */}
            <div className="min-w-0">
              <p className="truncate text-[11px] text-slate-400 sm:text-xs">
                Leave Management
              </p>

              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                {pageTitle}
              </h1>
            </div>

          </div>


          {/* =================================================
              HEADER RIGHT
          ================================================== */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">

            {/* Notification */}
            <button
              type="button"
              aria-label="Notifikasi"
              className="
                relative
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                text-slate-500
                shadow-sm
                transition-all
                hover:border-slate-300
                hover:text-slate-800
              "
            >
              <Bell size={18} />

              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-violet-500" />
            </button>


            {/* Divider */}
            <div className="mx-1 hidden h-7 w-px bg-slate-200 sm:block" />


            {/* Profile */}
            <div className="relative">

              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="
                  flex
                  max-w-[190px]
                  items-center
                  gap-2
                  rounded-xl
                  p-1.5
                  pr-2
                  transition-colors
                  hover:bg-white
                "
              >

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-bold text-white">
                  VA
                </div>

                <div className="hidden min-w-0 text-left sm:block">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    Vindra Arya
                  </p>

                  <p className="truncate text-[10px] text-slate-400">
                    Owner
                  </p>
                </div>

                <ChevronDown
                  size={15}
                  className={`
                    hidden
                    shrink-0
                    text-slate-400
                    transition-transform
                    sm:block

                    ${
                      profileOpen
                        ? 'rotate-180'
                        : ''
                    }
                  `}
                />

              </button>


              {/* =================================================
                  PROFILE DROPDOWN
              ================================================== */}
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -5,
                      scale: 0.98,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      y: -5,
                      scale: 0.98,
                    }}
                    className="
                      absolute
                      right-0
                      top-[calc(100%+8px)]
                      z-50
                      w-56
                      overflow-hidden
                      rounded-2xl
                      border
                      border-slate-200
                      bg-white
                      p-2
                      shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)]
                    "
                  >

                    <div className="border-b border-slate-100 px-3 py-2.5">

                      <p className="text-xs font-semibold text-slate-800">
                        Vindra Arya
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Owner
                      </p>

                    </div>


                    <button
                      type="button"
                      className="
                        mt-1
                        flex
                        w-full
                        items-center
                        gap-2.5
                        rounded-xl
                        px-3
                        py-2.5
                        text-left
                        text-xs
                        font-medium
                        text-slate-600
                        hover:bg-slate-50
                      "
                    >
                      <Settings size={16} />
                      Pengaturan Akun
                    </button>


                    <button
                      type="button"
                      className="
                        flex
                        w-full
                        items-center
                        gap-2.5
                        rounded-xl
                        px-3
                        py-2.5
                        text-left
                        text-xs
                        font-medium
                        text-red-500
                        hover:bg-red-50
                      "
                    >
                      <LogOut size={16} />
                      Keluar
                    </button>

                  </motion.div>
                )}
              </AnimatePresence>

            </div>

          </div>

        </header>


        {/* ===================================================
            PAGE CONTENT
        ==================================================== */}
        <main className="min-w-0 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

          <AnimatePresence mode="wait">

            <motion.div
              key={location.pathname}
              initial={{
                opacity: 0,
                y: 8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.25,
              }}
              className="min-w-0"
            >
              {children}
            </motion.div>

          </AnimatePresence>

        </main>

      </div>

    </div>
  )
}

export default DashboardLayout