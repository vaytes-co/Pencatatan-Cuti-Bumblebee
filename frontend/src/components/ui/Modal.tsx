import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: ModalProps) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          {/* Overlay */}
          <motion.button
            type="button"
            aria-label="Tutup modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-slate-950/30 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
              scale: 0.97,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 10,
              scale: 0.98,
            }}
            transition={{
              duration: 0.2,
            }}
            className={`
              relative z-10
              w-full
              overflow-hidden
              rounded-3xl
              border border-slate-200
              bg-white
              shadow-[0_30px_100px_-30px_rgba(15,23,42,0.35)]
              ${sizes[size]}
            `}
          >

            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {title}
                </h2>

                {description && (
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    {description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>

            </div>

            {/* Content */}
            <div className="max-h-[calc(100vh-180px)] overflow-y-auto p-6">
              {children}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default Modal